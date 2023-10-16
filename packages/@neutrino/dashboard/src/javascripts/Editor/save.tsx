import { toast } from 'react-hot-toast';

export async function attemptWithToast<T = unknown>(fn: () => Promise<T>, pending: string, success: string, error: string): Promise<T> {
  const toastId = toast.loading(pending, {
    position: 'bottom-center',
    style: {
      fontFamily: 'fontawesome, var(--sans-stack)',
      background: 'white',
      color: 'black',
      fontWeight: 'bold',
    },
  });

  try {
    const now = Date.now();
    const res = await fn();
    await new Promise((resolve) => setTimeout(resolve, 2000 - (Date.now() - now)));
    toast.success(success, {
      id: toastId,
      style: {
        fontFamily: 'fontawesome, var(--sans-stack)',
        background: 'var(--green-4)',
        color: 'white',
        fontWeight: 'bold',
      },
      icon: <div class="toast--success" />,
      duration: 3000,
    });
    return res;
  }
  catch (err) {
    toast.success(error, {
      id: toastId,
      style: {
        fontFamily: 'fontawesome, var(--sans-stack)',
        background: 'var(--red-4)',
        color: 'white',
        fontWeight: 'bold',
      },
      icon: <div class="toast--error" />,
      duration: 3000,
    });
    throw err;
  }
}
