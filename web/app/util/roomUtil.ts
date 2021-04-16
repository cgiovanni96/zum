import io from 'socket.io-client'
export const socket = io()

export const request = (
	type: string,
	data: Record<string, unknown>
): Promise<unknown> => {
	return new Promise((resolve, reject) => {
		socket.emit(type, data, (result) => {
			if (result.error) reject(result)
			resolve(result)
		})
	})
}
