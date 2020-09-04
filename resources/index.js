
const EVENTS = {
	GET_STACK: 'GET_STACK',
	EDIT_LIST: 'EDIT_LIST'
};

const vscode = acquireVsCodeApi();

// request start
const resovleMap = {};

function request(event, data = {}) {
    const requestId = (Date.now() + Math.random()) + '';
    return new Promise((resovle, reject) => {
        vscode.postMessage({
            event,
            requestId,
            data
        });
        resovleMap[requestId] = resovle;
    });
}

window.addEventListener('message', res => {
    const data = res.data;
    const requestId = data['requestId'];
    const resolve = resovleMap[requestId];
    if(resolve) {
        resolve(data);
        delete resovleMap[requestId];
    }
});

// request end

window.onload = () => {
    new Vue({
        el: '#app',
        data: {
            stack: {},
            selectedListUid: null,
        },
        computed: {
            stackArr() {
                return Object.values(this.stack);
            },
            selectedListInfo() {
                console.log(this.stack[this.selectedListUid])
                return this.stack[this.selectedListUid];
            }
        },
        mounted() {
           
            this.updateStack().then((stack) => {
                let uids = Object.keys(stack);
                console.log(uids)
                if(this.selectedListUid === null && uids.length) {
                    // select default with first uid
                    this.handleSelectList(uids[0]);
                }
            });
        },
        methods: {
            handleAddList() {
                this.handleSaveList({name: 'New List'});
            },
            handleSelectList(uid) {
                this.selectedListUid = uid;
                const listInfo = this.stack[uid];
                console.log(listInfo);
            },
            handleSaveList(list) {
                request(EVENTS.EDIT_LIST, list).then(res => {
                    this.updateStack();
                });
            },
            updateStack() {
                return request(EVENTS.GET_STACK).then(res => {
                    const data = res.data;
                    stack = data.stack;
                    this.stack = stack;
                    return stack;
                });
                
            }
        }
    });
};