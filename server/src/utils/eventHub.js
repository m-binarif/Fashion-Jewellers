/**
 * eventHub.js — In-memory SSE broadcast hub for real-time synchronization.
 * Connects clients (admins & employees) and broadcasts database mutation events.
 */

const clients = new Set();

function addClient(client) {
  clients.add(client);
}

function removeClient(client) {
  clients.delete(client);
}

function broadcast(eventType, data = {}) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch (_) {
      clients.delete(client);
    }
  }
}

function getConnectedClientCount() {
  return clients.size;
}

module.exports = {
  addClient,
  removeClient,
  broadcast,
  getConnectedClientCount,
};
