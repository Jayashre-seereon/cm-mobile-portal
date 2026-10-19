import api from './axios';

function buildHeaders(moduleId, previewSessionId) {
  const headers = {};

  if (moduleId !== null && moduleId !== undefined && moduleId !== '') {
    headers['x-module-id'] = moduleId;
  }

  if (previewSessionId) {
    headers['x-preview-session'] = previewSessionId;
  }

  return headers;
}

export async function getCareerLibraryCategories() {
  const response = await api.get('/careerlibrary/categories');
  return response?.data ?? null;
}

export async function getCareerLibraryStreams() {
  const response = await api.get('/streams/');
  return response?.data ?? null;
}

export async function getCareerLibraryCategoriesByStream(streamId, moduleId) {
  const response = await api.get(`/categories/stream/${streamId}`, {
    headers: buildHeaders(moduleId),
  });
  return response?.data ?? null;
}

export async function getCareerLibraryNext(type, id, moduleId, previewSessionId) {
  const response = await api.get(`/careerlibrary/next/${type}/${id}`, {
    headers: buildHeaders(moduleId, previewSessionId),
  });
  return response?.data ?? null;
}

export async function getCareerLibraryDetails(subcategoryId, moduleId, previewSessionId) {
  const response = await api.get(`/careerlibrary/subcategory/${subcategoryId}/details`, {
    headers: buildHeaders(moduleId, previewSessionId),
  });
  return response?.data ?? null;
}

export async function startCareerLibraryPreview({ moduleId, pageType, pageId }) {
  if (moduleId === null || moduleId === undefined || moduleId === '' || pageType === null || pageType === undefined || pageType === '' || pageId === null || pageId === undefined || pageId === '') {
    throw new Error('moduleId, pageType, and pageId are required.');
  }

  const response = await api.post('/module-access/preview/start', {
    moduleId,
    pageType,
    pageId,
  });

  return response?.data ?? null;
}
