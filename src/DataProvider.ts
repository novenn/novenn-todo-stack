import * as vscode from 'vscode';

export class DataProvider implements vscode.TreeDataProvider<Dependency> {
    private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | void> = new vscode.EventEmitter<Dependency | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> = this._onDidChangeTreeData.event;

    constructor() {
		console.log('%%%%%%%%%%%%%%%%%');
    }
    
    refresh(): void {
		this._onDidChangeTreeData.fire();
    }
    
    getTreeItem(element: Dependency): vscode.TreeItem {
		return element;
    }
    
    getChildren(element?: Dependency): Thenable<Dependency[]> {
		console.log('%%%%%%%%%%%%%%%%%222');
		return Promise.resolve([
			new Dependency("zhang san", '1.0.0', vscode.TreeItemCollapsibleState.Collapsed),
			new Dependency("zhang san", '1.0.0', vscode.TreeItemCollapsibleState.Collapsed),
		]);

	}

}


export class Dependency extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		private version: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return `${this.label}-${this.version}`;
	}

	get description(): string {
		return this.version;
	}

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	contextValue = 'dependency';

}