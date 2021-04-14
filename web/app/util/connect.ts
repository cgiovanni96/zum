import React, { SetStateAction } from 'react'
import socketClient from 'socket.io-client'
import createSocketRequest from './createSocketRequest'
import loadDevice from './loadDevice'
import { Device } from 'mediasoup-client/lib/Device'

export type SetDevice = React.Dispatch<SetStateAction<Device>>

const connect = (setDevice: SetDevice): void => {
	const opts = {
		path: '/server',
		transports: ['websocket']
	}

	const url = `http://localhost:5000`

	const socket = socketClient(url, opts)
	const socketRequest = createSocketRequest(socket)

	socket.on('connect', async () => {
		console.log(socket.connected)

		const data = await socketRequest('getRouterRtpCapabilities')
		await loadDevice(data, setDevice)
	})
}

export default connect
