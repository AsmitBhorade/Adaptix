import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Adaptix 3.0 Native Semantic "Smart" Diff Content Provider
 * 
 * Provides a virtual read-only TextDocumentContentProvider (adaptix-diff://)
 * allowing developers to inspect side-by-side semantic refactorings natively
 * in VS Code's diff viewer without polluting the user's workspace with temp files.
 */
export class AdaptixDiffContentProvider implements vscode.TextDocumentContentProvider {
    public static readonly scheme = 'adaptix-diff';
    private static instance: AdaptixDiffContentProvider;

    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    public readonly onDidChange = this._onDidChange.event;

    private _contentStore = new Map<string, string>();
    private _pendingRefactors = new Map<string, { originalUri: vscode.Uri; proposedCode: string }>();

    public static getInstance(): AdaptixDiffContentProvider {
        if (!AdaptixDiffContentProvider.instance) {
            AdaptixDiffContentProvider.instance = new AdaptixDiffContentProvider();
        }
        return AdaptixDiffContentProvider.instance;
    }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        return this._contentStore.get(uri.toString()) || '// No diff content available';
    }

    public updateContent(uri: vscode.Uri, content: string): void {
        this._contentStore.set(uri.toString(), content);
        this._onDidChange.fire(uri);
    }

    /**
     * Opens native VS Code side-by-side diff between the original file and proposed refactor
     */
    public async openDiff(
        originalUri: vscode.Uri,
        proposedCode: string,
        title: string = 'Adaptix Smart Diff (Original ↔ Proposed Refactor)'
    ): Promise<vscode.Uri> {
        const baseName = path.basename(originalUri.fsPath);
        const virtualUri = vscode.Uri.parse(`${AdaptixDiffContentProvider.scheme}:/${baseName}`);

        this._contentStore.set(virtualUri.toString(), proposedCode);
        this._pendingRefactors.set(virtualUri.toString(), { originalUri, proposedCode });
        this._onDidChange.fire(virtualUri);

        await vscode.commands.executeCommand('vscode.diff', originalUri, virtualUri, title);
        return virtualUri;
    }

    /**
     * Applies the pending proposed refactor into the active original document safely
     */
    public async acceptRefactor(virtualUri: vscode.Uri): Promise<boolean> {
        const pending = this._pendingRefactors.get(virtualUri.toString());
        if (!pending) {
            vscode.window.showErrorMessage('Adaptix: No pending refactor found for this diff.');
            return false;
        }

        const edit = new vscode.WorkspaceEdit();
        const document = await vscode.workspace.openTextDocument(pending.originalUri);
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );

        edit.replace(pending.originalUri, fullRange, pending.proposedCode);
        const applied = await vscode.workspace.applyEdit(edit);

        if (applied) {
            vscode.window.showInformationMessage('Adaptix 3.0: Refactoring applied successfully!');
            this._pendingRefactors.delete(virtualUri.toString());
            this._contentStore.delete(virtualUri.toString());
        } else {
            vscode.window.showErrorMessage('Adaptix: Failed to apply refactoring edits to original document.');
        }

        return applied;
    }

    public getPendingRefactor(virtualUri: vscode.Uri) {
        return this._pendingRefactors.get(virtualUri.toString());
    }

    public clear(virtualUri?: vscode.Uri): void {
        if (virtualUri) {
            this._contentStore.delete(virtualUri.toString());
            this._pendingRefactors.delete(virtualUri.toString());
        } else {
            this._contentStore.clear();
            this._pendingRefactors.clear();
        }
    }
}

