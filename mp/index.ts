// index.ts

let nextId: number = 0;

const generateNextId = () => nextId++;

export type TooltipComponent = WechatMiniprogram.Component.Instance<DataOption, PropertyOption, MethodOption>;

type DataOption = {
    messages: Message[];
};

type PropertyOption = {
    verticalOffset: WechatMiniprogram.Component.FullProperty<StringConstructor>;
};

type MethodOption = {
    show(level: TooltipLevel, message: string, duration: number): void;
    onMessageExitDone(event: WechatMiniprogram.BaseEvent): void;
}

type TooltipLevel = 'info' | 'warning' | 'error';

class Message {

    readonly id: number;
    readonly level: TooltipLevel;
    readonly content: string;
    exiting: boolean;

    private readonly expirePromise: Promise<Message>;

    constructor(level: TooltipLevel, content: string, duration: number) {
        this.id = generateNextId();
        this.level = level;
        this.content = content;
        this.exiting = false;
        this.expirePromise = new Promise(resolve => setTimeout(() => resolve(this), duration));
    }

    waitForExpiration(): Promise<Message> {
        return this.expirePromise;
    }
}

Component<DataOption, PropertyOption, MethodOption>({
    properties: {
        verticalOffset: {
            type: String,
            value: '5vw',
        },
    },
    data: {
        messages: [],
    },
    methods: {
        show(this: TooltipComponent, level: TooltipLevel, message: string, duration: number): void {
            const msg = new Message(level, message, duration);
            this.setData({messages: [...this.data.messages, msg]});
            msg.waitForExpiration().then(m => {
                const index = this.data.messages.findIndex(item => item.id === m.id);
                this.setData({[`messages[${index}].exiting`]: true});
            });
        },

        onMessageExitDone(event: WechatMiniprogram.BaseEvent): void {
            const msg = event.currentTarget.dataset.message as Message;
            if (!msg.exiting) {
                return;
            }
            const messages = this.data.messages;
            messages.splice(messages.findIndex(m => m.id === msg.id), 1);
            this.setData({messages});
        },
    },
});

export type TooltipOptions = {
    componentId: string;
    componentFetcher: () => TooltipComponent | null;
};

export default class Tooltip {

    static readonly defaultOptions: TooltipOptions = {
        componentId: 'tooltip',
        componentFetcher: function () {
            const pages = getCurrentPages();
            const currentPage = pages[pages.length - 1];
            return currentPage.selectComponent(`#${this.componentId}`) as TooltipComponent ?? (() => {
                wx.showToast({
                    title: 'Tooltip undefined',
                    icon: 'error',
                }).catch(err => console.error(err));
                return null;
            })();
        },
    }

    static info(message: string, duration: number = 5000, opts: TooltipOptions = Tooltip.defaultOptions): void {
        (opts ?? Tooltip.defaultOptions).componentFetcher()?.show('info', message, duration);
    }

    static warning(message: string, duration: number = 5000, opts: TooltipOptions = Tooltip.defaultOptions): void {
        (opts ?? Tooltip.defaultOptions).componentFetcher()?.show('warning', message, duration);
    }

    static error(message: string, duration: number = 5000, opts: TooltipOptions = Tooltip.defaultOptions): void {
        (opts ?? Tooltip.defaultOptions).componentFetcher()?.show('error', message, duration);
    }
}