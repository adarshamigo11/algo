import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

export const useSocket = () => {
  const { token } = useAuth()
  const socketRef  = useRef(null)
  const [prices,     setPrices]     = useState({})
  const [lastOrder,  setLastOrder]  = useState(null)
  const [lastSignal, setLastSignal] = useState(null)
  const [connected,  setConnected]  = useState(false)

  useEffect(() => {
    if (!token) return

    const socket = io('/', { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('live_price', (tick) => {
      setPrices(prev => ({ ...prev, [tick.symbol]: tick }))
    })

    socket.on('order_update', (order) => {
      setLastOrder(order)
    })

    socket.on('strategy_signal', (signal) => {
      setLastSignal(signal)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  return { prices, lastOrder, lastSignal, connected, socket: socketRef.current }
}