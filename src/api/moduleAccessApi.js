import api from './axios';

function extractModuleItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (payload?.data && typeof payload.data === 'object') {
    return [payload.data];
  }

  if (payload && typeof payload === 'object') {
    return [payload];
  }

  return [];
}

export async function getModules() {
  const response = await api.get('/modules');
  return extractModuleItems(response?.data);
}

export async function checkModuleAccess(moduleId) {
  if (moduleId === null || moduleId === undefined || moduleId === '') {
    throw new Error('Module id is required.');
  }

  const response = await api.post('/module-access/check', {
    moduleId,
  });

  return response?.data ?? null;
}

