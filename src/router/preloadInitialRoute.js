/** Give a fast first route a head start without withholding navigation on a stall. */
export async function preloadInitialRoute(load, timeoutMs = 150) {
  if (!load) return;
  let timer;
  try {
    await Promise.race([load(), new Promise((resolve) => { timer = setTimeout(resolve, timeoutMs); })]);
  } finally {
    clearTimeout(timer);
  }
}
