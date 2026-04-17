import NProgress from 'nprogress';

NProgress.configure({ 
  showSpinner: false,
  trickleSpeed: 100,
  speed: 200,
  minimum: 0.1
});

let activeRequests = 0;

export const startProgress = () => {
  activeRequests++;
  if (activeRequests === 1) {
    NProgress.start();
  }
};

export const doneProgress = () => {
  activeRequests--;
  if (activeRequests <= 0) {
    activeRequests = 0;
    NProgress.done();
  }
};

export default { startProgress, doneProgress };
