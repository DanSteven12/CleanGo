import { Server, Socket } from 'socket.io';

export function setupSocketEvents(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('unirse_a_recorrido', (recorridoId: number) => {
      if (!recorridoId) return;
      const roomName = `recorrido:${recorridoId}`;
      socket.join(roomName);
    });

    socket.on('salir_de_recorrido', (recorridoId: number) => {
      if (!recorridoId) return;
      const roomName = `recorrido:${recorridoId}`;
      socket.leave(roomName);
    });

    socket.on('disconnect', (reason) => {
      // Limpieza si es necesaria
    });
  });
}
