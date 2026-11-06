export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Koneksi bermasalah. Silakan coba lagi.'
}
export function requireData<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error
  return result.data
}
export async function withTimeout<T>(operation: PromiseLike<T>, milliseconds = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([Promise.resolve(operation), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Koneksi terlalu lama. Silakan coba lagi.')), milliseconds)
    })])
  } finally { clearTimeout(timer) }
}
