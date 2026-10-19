import axiosInstance from "./axios";

export const getTestHistory = async () => {
  return axiosInstance.get("/quiz/history");
};

export const getMentorBookings = async () => {
  return axiosInstance.get("/mentor-booking/my-mentor-bookings");
};

export const getSubscriptions = async () => {
  return axiosInstance.get("/mentor-booking/my-subscriptions");
};