
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
            selectedEventUid: null,
            newEventContent: '',
            selectedTaskList: [],
            selectedEvent: null,
            isHeight:true,
            minHeight:0,

            STATUS
        },
        computed: {
            stackArr() {
                const  stack = Object.values(this.stack);
                const undoStack = stack.filter(item => item.done !== item.total).sort((a, b) => b.createTime - b.createTime);
                const doneStack = stack.filter(item => item.done === item.total).sort((a, b) => b.createTime - b.createTime);
                return [...undoStack, ...doneStack];
            },
            selectedListInfo() {
                return this.stack[this.selectedListUid] && JSON.parse(JSON.stringify(this.stack[this.selectedListUid]));
            },
            undoTaskList() {
                return this.selectedTaskList ? 
                this.selectedTaskList
                    .filter(item => item.status === STATUS.UNDO)
                    .sort((a, b) => b.updateTime - a.updateTime)
                : [];
            },
            doneTaskList() {
                return this.selectedTaskList ? 
                    this.selectedTaskList
                        .filter(item => item.status === STATUS.DONE)
                        .sort((a, b) => b.updateTime - a.updateTime)
                    : [];
            }
        },
        watch: {
            selectedListInfo() {
                this.updateList();
            }
        },
        filters: {
             dataformat: function(time, format){
                var t = new Date(time);
                var tf = function(i){return (i < 10 ? '0' : '') + i};
                return format.replace(/yyyy|MM|dd|HH|mm|ss/g, function(a){
                    switch(a){
                        case 'yyyy':
                            return tf(t.getFullYear());
                            break;
                        case 'MM':
                            return tf(t.getMonth() + 1);
                            break;
                        case 'mm':
                            return tf(t.getMinutes());
                            break;
                        case 'dd':
                            return tf(t.getDate());
                            break;
                        case 'HH':
                            return tf(t.getHours());
                            break;
                        case 'ss':
                            return tf(t.getSeconds());
                            break;
                    }
                });
            }
        },
        mounted() {
            this.updateStack().then((stack) => {
                if(this.selectedListUid === null && this.stackArr.length) {
                    // select default with first uid
                    this.$nextTick(() => {
                        this.handleSelectList(this.stackArr[0].uid);
                    });
                }
            });
        },
        methods: {
            autoTextarea() {
                var extra = 0,   //设置光标与输入框保持的距离(默认0)
        　　　　maxHeight = 1000; //设置最大高度(可选)
        　　　　var _that = this;
        　　　　var isFirefox = !!document.getBoxObjectFor || 'mozInnerScreenX' in window,
        　　　　isOpera = !!window.opera && !!window.opera.toString().indexOf('Opera');
        　　　　　var paddingTop,paddingBottom
                var style,_length,valueLength,stylHeight,scrollHeight,currHeight;
        
                    this.$nextTick(function () {
                        if(this.isHeight){
                        this.isHeight =  false
                        this.minHeight = parseFloat(window.getComputedStyle(this.$refs.elememt).height)
                        }
        
                        paddingTop = parseInt(window.getComputedStyle(this.$refs.elememt).paddingTop)
                        paddingBottom = parseInt(window.getComputedStyle(this.$refs.elememt).paddingBottom)
                        style = this.$refs.elememt.style
                        _length = this.$refs.elememt._length
                        valueLength = this.$refs.elememt.value.length
                        stylHeight = this.$refs.elememt.style.height
                        scrollHeight = this.$refs.elememt.scrollHeight
                        currHeight = this.$refs.elememt.currHeight
        
                        change()
                    })
        
                function change(){
                    var  height, padding = 0;
        
                    if (_length === valueLength) return;
                        _length = valueLength;
        
                    if (!isFirefox && !isOpera) {
                    padding = paddingTop + paddingBottom;
                    };
                    stylHeight = _that.minHeight + 'px';  //30px
                    console.log(scrollHeight,_that.minHeight,maxHeight,padding)
                    if (scrollHeight > _that.minHeight) {
                    if (maxHeight && scrollHeight > maxHeight) {
                        height = maxHeight - padding;
                    //              style.overflowY = 'auto';
                        style.overflowY = 'hidden';
                    } else {
                        height = scrollHeight - padding;      //undefined 30 9
                        style.overflowY = 'hidden';
                    };
        
                    style.height = height + extra + 'px';
                    currHeight = parseInt(style.height);
                    };
                }
            },
            handleAddList() {
                this.handleSaveList({name: 'New List'});
            },
            handleSelectList(uid) {
                this.selectedListUid = uid;
                this.selectedEventUid = null;
                this.selectedEvent = null;
                this.$nextTick(() => {
                    this.updateList();
                });
            },
            handleSelectEvent(event) {
                if(this.selectedEventUid && this.selectedEventUid === event.uid) {
                    this.selectedEvent = null;
                    this.selectedEventUid = null;
                } else {
                    this.selectedEvent = event;
                    this.selectedEventUid = event.uid;
                }
            },
            handleSaveList(list) {
                request(EVENTS.EDIT_LIST, list).then(res => {
                    this.updateStack();
                });
            },
            handleUpdataListName() {
                this.handleSaveList(Object.assign({}, this.selectedListInfo));
            },
            updateStack() {
                return request(EVENTS.GET_STACK).then(res => {
                    const data = res.data;
                    let stack = data.stack;
                    this.stack = stack;
                    return stack;
                });
            },
            updateList() {
                request(EVENTS.GET_LIST, {
                    uid: this.selectedListInfo['uid']
                }).then(res => {
                    this.selectedTaskList = res.data;
                });
            },
            handleToggleEventStatus(event) {
                const status = event.status === STATUS.DONE ? STATUS.UNDO : STATUS.DONE;
                request(EVENTS.SAVE_EVENT,
                    Object.assign({
                        listUid: this.selectedListInfo.uid,
                    }, event, {
                        status
                    })).then(() => {
                    this.updateStack();
                    this.updateList();
                    // 如果是从右侧点击的话
                    event.status = status;
                });
            },
            handlechange(event) {
                console.log(event.target.innerText)
            },
            handleEditEventNameChange(event) {
                let content = event.target.innerText|| '';
                content = content.replace(/\t|\r|\n/g, '\s');
                this.selectedEvent.content = content;
                this.handleEditEvent();
            },
            handleEditEvent() {
                const event = this.selectedEvent;
                request(EVENTS.SAVE_EVENT, {
                    listUid: this.selectedListInfo.uid,
                    content: event.content,
                    uid: event.uid,
                    status: event.status,
                    remarks: event.remarks,
                }).then(() => {
                    this.updateStack();
                    this.updateList();
                });
            },
            handleNewEvent() {
                if(!this.newEventContent) {
                    return;
                }

                request(EVENTS.SAVE_EVENT, {
                    listUid: this.selectedListInfo.uid,
                    content: this.newEventContent
                }).then(() => {
                    this.newEventContent = '';
                    this.updateStack();
                    this.updateList();
                });
            },
            handleRemoveList() {
                if(this.$refs.modal) {
                    this.$refs.modal.show('Are you sure to delete it?').then(res => {
                        request(EVENTS.REMOVE_LIST, this.selectedListUid).then(res => {
                            this.updateStack();
                            this.selectedListUid = null;
                            this.selectedEvent = null;
                            this.selectedTaskList = [];
                        });
                    });
                }
            },
            handleRemoveEvent() {
                const listUid = this.selectedListUid;
                const uid = this.selectedEventUid;
                request(EVENTS.REMOVE_EVENT, {
                    listUid,
                    uid
                }).then(() => {
                    this.selectedEvent = null;
                    this.selectedEventUid = null;
                    this.updateStack();
                    this.updateList();
                });
            }
        }
    });
};


// register modal component

Vue.component('modal', {
    template: `
        <div class="modal" v-if="open" @click="handleCancel">
            <div class="modal__container">
                <div class="modal__body">{{message}}</div>
                <div class="modal__footer">
                    <div class="modal__footer__btn" @click.stop="handleCancel">Cancel</div>
                    <div class="modal__footer__btn" @click.stop="handleConfirm">Confirm</div>
                </div>
            </div>
        </div>
    `,
    data: () => ({
        message: '',
        open: false,
        resolve: null
    }),
    methods: {
        show(message) {
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.message = message;
                this.open = true;
            });
        },
        handleConfirm() {
            this.open = false;
            this.resolve && this.resolve();
        },
        handleCancel() {
            this.open = false;
        }
    }
});
