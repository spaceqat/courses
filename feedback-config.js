/* Public endpoint configuration. Keep credentials out of this file. */
(() => {
  const api = 'https://openqi-course-feedback.spaceqat-course-feedback.workers.dev';
  window.SPQ_FEEDBACK_ENDPOINT = `${api}/api/course-feedback`;
  window.SPQ_PROGRESS_ENDPOINT = `${api}/api/course-progress`;
  window.SPQ_COMPLETION_ENDPOINT = `${api}/api/course-completion`;
})();
