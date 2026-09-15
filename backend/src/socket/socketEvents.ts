import { Server, Socket } from 'socket.io';
import { setSimulationSpeed, getSimulationStats } from '../services/simulationService';

export function setupSocketEvents(io: Server) {
  io.on('connection', (socket: Socket) => {
    // Si la conexión es de un ciudadano autenticado, lo unimos a su room privado
    if (socket.data.user?.id) {
      socket.join(`usuario:${socket.data.user.id}`);
    }

    if (socket.data.camion?.camion_id) {
      socket.join(`camion:${socket.data.camion.camion_id}`);
    }

    socket.on('unirse_a_recorrido', (recorridoId: number) => {
      if (!recorridoId) return;
      const roomName = `recorrido:${recorridoId}`;
      socket.join(roomName);

      // Emitir inmediatamente el último estado conocido al cliente que se une
      const currentStats = getSimulationStats(recorridoId);
      if (currentStats) {
        socket.emit('ubicacion_actualizada', currentStats);
      }
    });

    socket.on('salir_de_recorrido', (recorridoId: number) => {
      if (!recorridoId) return;
      const roomName = `recorrido:${recorridoId}`;
      socket.leave(roomName);
    });

    // Cambio de velocidad desde mobile → backend actualiza y propaga a todos
    socket.on('cambiar_velocidad', (data: { recorridoId: number; velocidad: number }) => {
      if (!data?.recorridoId || !data?.velocidad) return;
      setSimulationSpeed(data.recorridoId, data.velocidad);
    });

    socket.on('disconnect', (reason) => {
      // Limpieza si es necesaria
    });
  });
}
