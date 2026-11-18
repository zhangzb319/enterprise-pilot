/** Java 后端调用封装。

所有请求透传用户 JWT,权限判断完全由 Java 侧负责,本服务不重复实现。
接口清单与 Python 版 JavaClient 一致。
 */

import { config } from "../config.js";
import { AppError } from "../errors.js";

type ApiBody<T> = { code: number; message: string; data?: T };

async function get<T>(path: string, authorization: string | null): Promise<T> {
    const response = await fetch(`${config.javaBackendUrl.replace(/\/$/, "")}${path}`, {
        headers: authorization ? { Authorization: authorization } : {},
        signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 401 || response.status === 403) {
        throw new AppError("当前账号无权访问该数据", response.status);
    }
    if (!response.ok) {
        throw new AppError(`Java 后端请求失败(${response.status})`, 502);
    }
    const body = (await response.json()) as ApiBody<T>;
    if (body.code !== 200) {
        throw new AppError(body.message || "Java 后端拒绝了该请求", 400);
    }
    return (body.data ?? ([] as unknown)) as T;
}

async function post<T>(path: string, payload: unknown, authorization: string | null): Promise<T | null> {
    const response = await fetch(`${config.javaBackendUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: {
            ...(authorization ? { Authorization: authorization } : {}),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
        throw new AppError(`Java 后端请求失败(${response.status})`, 502);
    }
    const body = (await response.json()) as ApiBody<T>;
    if (body.code !== 200) {
        throw new AppError(body.message || "Java 后端拒绝了该请求", 400);
    }
    return body.data ?? null;
}

async function put<T>(path: string, payload: unknown, authorization: string | null): Promise<T | null> {
    const response = await fetch(`${config.javaBackendUrl.replace(/\/$/, "")}${path}`, {
        method: "PUT",
        headers: {
            ...(authorization ? { Authorization: authorization } : {}),
            ...(payload != null ? { "Content-Type": "application/json" } : {}),
        },
        body: payload != null ? JSON.stringify(payload) : undefined,
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
        throw new AppError(`Java 后端请求失败(${response.status})`, 502);
    }
    const body = (await response.json()) as ApiBody<T>;
    if (body.code !== 200) {
        throw new AppError(body.message || "Java 后端拒绝了该请求", 400);
    }
    return body.data ?? null;
}

export class JavaClient {
    myBookings = (authorization: string | null) =>
        get<Record<string, unknown>[]>("/api/meeting/bookings/my", authorization);
    meetingRooms = (authorization: string | null) =>
        get<Record<string, unknown>[]>("/api/meeting/rooms", authorization);
    createBooking = (
        payload: { roomId: number; title: string; startTime: string; endTime: string },
        authorization: string | null,
    ) => post<null>("/api/meeting/bookings", payload, authorization);

    myProjects = (authorization: string | null) =>
        get<Record<string, unknown>[]>("/api/projects/my", authorization);
    /** 单次聚合查询,替代此前按项目逐个拉取的 N+1 实现。 */
    myTasks = (authorization: string | null) =>
        get<Record<string, unknown>[]>("/api/projects/tasks/my", authorization);
    createTask = (
        projectId: number,
        payload: { title: string; description?: string; assigneeId?: number; dueDate?: string },
        authorization: string | null,
    ) => post<null>(`/api/projects/${projectId}/tasks`, payload, authorization);
    updateTaskStatus = (taskId: number, status: number, authorization: string | null) =>
        put<null>(`/api/projects/tasks/${taskId}/status?status=${status}`, null, authorization);

    directory = (authorization: string | null) =>
        get<Record<string, unknown>[]>("/api/users/directory", authorization);
    sendMessage = (payload: { receiverId: number; content: string }, authorization: string | null) =>
        post<Record<string, unknown>>("/api/messages/send", payload, authorization);

    logQa = (payload: LogQaPayload, authorization: string | null) =>
        post<null>("/api/agent/log", payload, authorization);
}

export type LogQaPayload = {
    question: string;
    answer: string;
    referencedDocs: string[];
    tools: string[];
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
};
