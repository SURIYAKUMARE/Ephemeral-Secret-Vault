const { EventEmitter } = require('node:events');

class AdminEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  emitAccessEvent(eventData) {
    this.emit('access_event', eventData);
  }

  emitAlert(alertData) {
    this.emit('security_alert', alertData);
  }

  emitFileChange(changeData) {
    this.emit('file_change', changeData);
  }
}

const eventBus = new AdminEventBus();

module.exports = eventBus;
