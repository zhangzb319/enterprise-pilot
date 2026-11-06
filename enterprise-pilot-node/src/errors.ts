/** 统一业务错误,路由层转成与 Java/Python 一致的 {code, message} 响应。 */

export class AppError extends Error {
    readonly status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}
