import * as vscode from 'vscode';
const md5 = require('md5');
const fs = require('fs');
const path = require('path');
const EVENTS = {
	GET_STACK: 'GET_STACK',
	EDIT_LIST: 'EDIT_LIST'
};

const cache:any = {

};

let rootDir : string | undefined = '';

export function activate(context: vscode.ExtensionContext) {
	rootDir = context.globalStoragePath;
	let disposable = vscode.commands.registerCommand('todo-stack.open', () => {
		const panel = vscode.window.createWebviewPanel(
			'TodoStack',
			'Todo Stack',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

	console.log(rootDir, 'rootDir');
try {
	

		panel.webview.html = buildHtml(context, panel.webview);
		panel.webview.onDidReceiveMessage((request) => {
			dispatchEvent(request, panel.webview.postMessage.bind(panel.webview));
		});
		createRootDirIfNeed();
		createStackIfNeed();


	} catch (error) {
		console.error(error);
	}
		
	});

	context.subscriptions.push(disposable);

}

function buildHtml(context: vscode.ExtensionContext, webview: vscode.Webview) {
	const resources = {
		'logo.svg': webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'logo.svg')).toString()
	};
	try {
		let  html = fs.readFileSync(path.resolve(__dirname,'../resources/index.html'), 'utf-8');
		let  js = fs.readFileSync(path.resolve(__dirname,'../resources/index.js'), 'utf-8');
		const css = fs.readFileSync(path.resolve(__dirname,'../resources/index.scss'), 'utf-8');

		Object.entries(resources).forEach(([key, val]) => {
			html = html.replace(
				new RegExp(key, 'g'), 
				val
			);
		});

		js = `const resources = ${JSON.stringify(resources)};${js}`
		html = html.replace('{{code}}', js);
		html = html.replace('{{vue.min.js}}', webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'lib', 'vue.min.js')).toString());
		html = html.replace('{{style}}', `<style>${css}</style>`);
		return html;
	} catch (error) {
		return 'Error';
	}
	
}

function dispatchEvent({event, data, requestId}: {event:String, requestId:String, data:any}, response: Function) {
	let ret = null;
	try {
		switch(event) {
			case EVENTS.GET_STACK: ret = getStack(); break;
			case EVENTS.EDIT_LIST: ret = handleEditList(data); break;
		}
	
		response({
			event,
			requestId,
			data: ret
		});
	} catch (error) {
		console.error(error);
	}
	
}

function handleEditList(data: {
	uid: string,
	name: string,
}) {
	const stack:any = getStack();
	let {uid, name} = data;
	let list = stack[uid];
	if(!uid || list) {
		uid = md5(Date.now() + Math.random()).toUpperCase();
		let db = createList(uid);

		list = {
			uid,
			db,
			name,
			done: 0,
			total: 0,
			createTime: Date.now()
		};
	} else {
		list = Object.assign({}, ...list, name);
	}
	updateStack(uid, list);
	return uid;
}

function createRootDirIfNeed() {
	// TODO handle rootDir === undefined
	if(!fs.existsSync(rootDir)) {
		fs.mkdirSync(rootDir);
	}
}

function createStackIfNeed() {
	const stackJsonFile = path.resolve(rootDir, 'stack.json');
	if(!fs.existsSync(stackJsonFile)) {
		fs.writeFileSync(stackJsonFile, '{"stack":{}}', 'utf-8');
	}
}

function createList(uid: string) {
	const fileName = uid + '.json';
	const fullPath = path.resolve(rootDir, fileName);

	if(!fs.existsSync(rootDir)) {
		fs.mkdirSync(rootDir);
	}
	
	fs.writeFileSync(fullPath, 
		`{
			uid: ${uid},
			items: []
		}`
	);

	return fullPath;
}


function getStack() {
	if(!cache['stack']) {
		const stackJsonFile = path.resolve(rootDir, 'stack.json');
		const content = fs.readFileSync(stackJsonFile, 'utf-8');
		const stack =  content ? JSON.parse(content) : {stack: {}};
		cache['stack'] = stack;
	}
	return cache['stack'];
}

function updateStack(uid: string, list:any) {
	const stack = getStack();
	stack.stack[uid] = list;
	const stackJsonFile = path.resolve(rootDir, 'stack.json');
	fs.writeFileSync(stackJsonFile, JSON.stringify(stack, null, 2), 'utf-8');
	cache['stack'] = stack;
}

// this method is called when your extension is deactivated
export function deactivate() {}
