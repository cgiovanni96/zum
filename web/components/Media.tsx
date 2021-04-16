import React, { useEffect, useRef } from 'react'
import { RoomStream } from '../store/useRoomStore'

type MediaProps = {
	media: RoomStream
}

const Media: React.FC<MediaProps> = ({ media }) => {
	const ref = useRef<HTMLVideoElement>(null)

	useEffect(() => {
		ref.current.srcObject = media.stream
	}, [])

	return <>{ref && <video ref={ref} autoPlay playsInline />}</>
}

export default Media
