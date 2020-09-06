import * as vscode from 'vscode';
const md5 = require('md5');
const fs = require('fs');
const path = require('path');
const EVENTS = {
	GET_STACK: 'GET_STACK',
	EDIT_LIST: 'EDIT_LIST',
	SAVE_EVENT: 'SAVE_EVENT',
	GET_LIST: 'GET_LIST',
	REMOVE_LIST: 'REMOVE_LIST',
    REMOVE_EVENT: 'REMOVE_EVENT',
};

const STATUS = {
	UNDO: 0,
	DONE: 1,
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
		'logo.svg': webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'logo.svg')).toString(),
		'list.svg': webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'list.svg')).toString(),
		'remove.svg': webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'remove.svg')).toString(),
		'plus.svg': webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'plus.svg')).toString(),
		'favico.svg': webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'favico.svg')).toString(),
		'empty.svg': webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'empty.svg')).toString(),
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

		js = `const resources = ${JSON.stringify(resources)};${js}`;
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
			case EVENTS.GET_STACK: ret = {stack: getStack()}; break;
			case EVENTS.EDIT_LIST: ret = handleEditListMetaInfo(data); break;
			case EVENTS.SAVE_EVENT: ret = handleSaveEvent(data); break;
			case EVENTS.GET_LIST: ret = handleGetList(data); break;
			case EVENTS.REMOVE_LIST: ret = handleRemoveList(data); break;
			case EVENTS.REMOVE_EVENT: ret = handleRemoveEvent(data); break;
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

function getDBPath(uid:string) {
	return path.resolve(rootDir, `${uid}.json`);
}

function handleEditListMetaInfo(data: {
	uid: string,
	name: string,
}) {
	const stack:any = getStack();
	let {uid, name} = data;
	let list = stack[uid];
	if(!uid || !list) {
		uid = md5(Date.now() + Math.random()).toUpperCase();
		createList(uid);

		list = {
			uid,
			name,
			done: 0,
			total: 0,
			createTime: Date.now()
		};
	} else {
		list = Object.assign({}, list, {name});
	}
	updateStack(uid, list);
	return uid;
}


function handleSaveEvent(data: any) {
	const uid = data.uid || md5(Date.now() + Math.random()).toUpperCase();
	const listUid = data.listUid;
	const content = data.content;
	const status = data.status || STATUS.UNDO;
	const remarks = data.remarks || '';
	const stack = getStack();
	const dbPath = getDBPath(listUid);
	const listMetaInfo = stack[listUid];
	const list = getList(dbPath);
	let event = list[uid];

	if(!event) {
		event = {
			uid,
			createTime: Date.now(),
			status: STATUS.UNDO,
		};
	}

	list[uid] = Object.assign(event, {
		content,
		status,
		remarks,
		updateTime: Date.now()
	});

	fs.writeFileSync(dbPath, JSON.stringify(list, null, 2), 'utf-8'); 

	// update metaData
	let events = Object.values(list);
	let totalCnt = events.length;
	let doneCnt = events.filter((item:any) => item.status === STATUS.DONE).length;
	listMetaInfo['total'] = totalCnt;
	listMetaInfo['done'] = doneCnt;
	updateStack(listUid, listMetaInfo);
	return;
}

function handleGetList(data: any) {
	const uid = data['uid'];
	const dbPath = getDBPath(uid);
	const list = getList(dbPath);
	return Object.values(list);
}

function handleRemoveList(uid: string) {
	deleteStack(uid);
}

function handleRemoveEvent(data: any) {
	const listUid = data.listUid;
	const uid = data.uid;
	const dbPath = getDBPath(listUid);

	const stack = getStack();
	const listMetaInfo = stack[listUid];
	const list = getList(dbPath);
	delete list[uid];

	fs.writeFileSync(dbPath, JSON.stringify(list, null, 2), 'utf-8'); 

	// update metaData
	let events = Object.values(list);
	let totalCnt = events.length;
	let doneCnt = events.filter((item:any) => item.status === STATUS.DONE).length;
	listMetaInfo['total'] = totalCnt;
	listMetaInfo['done'] = doneCnt;
	updateStack(listUid, listMetaInfo);
	return;
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
		JSON.stringify({}, null, 2)
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
	return cache['stack']['stack'];
}

function getList(path: string) {
	const content = fs.readFileSync(path, 'utf-8');
	return content ? JSON.parse(content) : {};
}

function updateStack(uid: string, list:any) {
	const stack = {stack: getStack()};
	stack.stack[uid] = list;
	const stackJsonFile = path.resolve(rootDir, 'stack.json');
	fs.writeFileSync(stackJsonFile, JSON.stringify(stack, null, 2), 'utf-8');
	cache['stack'] = stack;
}

function deleteStack(uid:string) {
	const stack = {stack: getStack()};
	delete stack.stack[uid];
	const stackJsonFile = path.resolve(rootDir, 'stack.json');
	fs.writeFileSync(stackJsonFile, JSON.stringify(stack, null, 2), 'utf-8');
	cache['stack'] = stack;
}

// this method is called when your extension is deactivated
export function deactivate() {}
