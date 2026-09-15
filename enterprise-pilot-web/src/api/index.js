import request from './request'

export const userApi = {
  register: (data) => request.post('/api/users/register', data),
  login: (data) => request.post('/api/users/login', data),
  logout: () => request.post('/api/users/logout'),
  me: () => request.get('/api/users/me'),
  profile: () => request.get('/api/users/profile'),
  updateProfile: (data) => request.put('/api/users/profile', data),
  changePassword: (data) => request.put('/api/users/password', data),
  list: () => request.get('/api/users'),
  directory: () => request.get('/api/users/directory')
}

export const departmentApi = {
  tree: () => request.get('/api/departments/tree')
}

export const meetingApi = {
  rooms: () => request.get('/api/meeting/rooms'),
  allRooms: () => request.get('/api/meeting/rooms/all'),
  createRoom: (data) => request.post('/api/meeting/rooms', data),
  updateRoom: (id, data) => request.put(`/api/meeting/rooms/${id}`, data),
  disableRoom: (id) => request.put(`/api/meeting/rooms/${id}/disable`),
  roomBookings: (roomId) => request.get(`/api/meeting/bookings/room/${roomId}`),
  createBooking: (data) => request.post('/api/meeting/bookings', data),
  myBookings: () => request.get('/api/meeting/bookings/my'),
  cancelBooking: (id) => request.put(`/api/meeting/bookings/${id}/cancel`)
}

export const projectApi = {
  my: () => request.get('/api/projects/my'),
  create: (data) => request.post('/api/projects', data),
  tasks: (projectId) => request.get(`/api/projects/${projectId}/tasks`),
  createTask: (projectId, data) => request.post(`/api/projects/${projectId}/tasks`, data),
  discussions: (projectId) => request.get(`/api/projects/${projectId}/discussion/tree`),
  createDiscussion: (projectId, data) => request.post(`/api/projects/${projectId}/discussions`, data)
}

export const ragApi = {
  ingest: (data) => request.post('/ai/api/v1/rag/documents', data),
  ask: (data) => request.post('/ai/api/v1/rag/ask', data),
  list: () => request.get('/ai/api/v1/rag/documents'),
  get: (id) => request.get(`/ai/api/v1/rag/documents/${encodeURIComponent(id)}`),
  remove: (id) => request.delete(`/ai/api/v1/rag/documents/${encodeURIComponent(id)}`),
  categories: () => request.get('/ai/api/v1/rag/categories')
}

export const agentApi = {
  chat: (data) => request.post('/ai/api/v1/agent/chat', data)
}

export const notificationApi = {
  list: (params) => request.get('/api/notifications', { params }),
  unreadCount: () => request.get('/api/notifications/unread-count'),
  markRead: (id) => request.put(`/api/notifications/${id}/read`),
  markAllRead: () => request.put('/api/notifications/read-all'),
  remove: (id) => request.delete(`/api/notifications/${id}`)
}

export const messageApi = {
  conversations: () => request.get('/api/messages/conversations'),
  with: (userId) => request.get(`/api/messages/with/${userId}`),
  send: (data) => request.post('/api/messages/send', data),
  unreadCount: () => request.get('/api/messages/unread-count')
}
