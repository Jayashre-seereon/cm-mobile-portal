import api from './axios';

export async function forgotPassword(email) {
  const response = await api.post('/user/forgot-password', {
    email,
  });

  return response.data;
}

export async function resetPassword(token, newPassword, confirmPassword) {
  const response = await api.post('/user/reset-password', {
    token,
    newPassword,
    confirmPassword,
  });

  return response.data;
}
