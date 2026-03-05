/**
 * Typed API client — all requests proxied through Vite to http://localhost:8000
 */

const BASE = ''  // Vite proxy handles it

let _token: string | null = localStorage.getItem('token')

export function setToken(t: string) {
    _token = t
    localStorage.setItem('token', t)
}

export function clearToken() {
    _token = null
    localStorage.removeItem('token')
}

export function getToken() { return _token }

async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: RequestInit,
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    if (_token) headers['Authorization'] = `Bearer ${_token}`

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        ...opts,
    })

    if (res.status === 401) {
        clearToken()
        window.location.href = '/login'
        throw new Error('Unauthorized')
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || err.message || `HTTP ${res.status}`)
    }

    if (res.status === 204) return undefined as T
    return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const api = {
    auth: {
        register: (email: string, password: string) =>
            request<{ access_token: string }>('POST', '/auth/register', { email, password }),
        login: (email: string, password: string) =>
            request<{ access_token: string }>('POST', '/auth/login', { email, password }),
        me: () => request<any>('GET', '/auth/me'),
    },

    // ── Profile ────────────────────────────────────────────────────────────────

    profile: {
        get: () => request<any>('GET', '/profile'),
        update: (data: any) => request<any>('PUT', '/profile', data),
        export: () => request<any>('GET', '/profile/export'),
        delete: () => request<any>('DELETE', '/profile'),
    },

    // ── Plans ──────────────────────────────────────────────────────────────────

    plans: {
        generateWorkout: (data: any) => request<any>('POST', '/plans/workout', data),
        getWorkout: () => request<any>('GET', '/plans/workout/latest'),
        workoutHistory: () => request<any>('GET', '/plans/workout/history'),
        generateNutrition: (data: any) => request<any>('POST', '/plans/nutrition', data),
        getNutrition: () => request<any>('GET', '/plans/nutrition/latest'),
        nutritionHistory: () => request<any>('GET', '/plans/nutrition/history'),
    },

    // ── AROMI ──────────────────────────────────────────────────────────────────

    aromi: {
        chat: (message: string, session_id?: string) =>
            request<any>('POST', '/aromi/chat', { message, session_id }),
        getHistory: (session_id?: string) => {
            const qs = session_id ? `?session_id=${session_id}` : ''
            return request<any>('GET', `/aromi/history${qs}`)
        },
        adjust: (change_type: string, details: string, days_to_adjust = 4) =>
            request<any>('POST', '/aromi/adjust', { change_type, details, days_to_adjust }),
        events: (limit = 200, session_id?: string) => {
            const qs = session_id ? `?limit=${limit}&session_id=${session_id}` : `?limit=${limit}`
            return request<any[]>('GET', `/aromi/events${qs}`)
        },
        memory: {
            list: () => request<any[]>('GET', '/aromi/memory'),
            set: (key: string, value: string) => request<any>('PUT', '/aromi/memory', { key, value }),
            delete: (key: string) => request<any>('DELETE', `/aromi/memory/${key}`),
        },
    },

    // ── Progress ───────────────────────────────────────────────────────────────

    progress: {
        log: (data: any) => request<any>('POST', '/progress/log', data),
        logs: (days = 30) => request<any[]>('GET', `/progress/logs?days=${days}`),
        summary: () => request<any>('GET', '/progress/summary'),
    },

    // ── Gamification ───────────────────────────────────────────────────────────

    gamification: {
        dashboard: () => request<any>('GET', '/gamification/dashboard'),
        pledges: () => request<any[]>('GET', '/gamification/pledges'),
        createPledge: (data: any) => request<any>('POST', '/gamification/pledges', data),
        fulfillPledge: (id: string) => request<any>('PUT', `/gamification/pledges/${id}/fulfill`),
    },
}
