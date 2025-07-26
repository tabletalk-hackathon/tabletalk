import { LogEntry } from '@/types';

class Logger {
  private logs: LogEntry[] = [];

  private createLogEntry(type: LogEntry['type'], message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };
  }

  private getColorForType(type: LogEntry['type']): string {
    const colors = {
      gps: '#10B981', // green
      search: '#3B82F6', // blue
      llm: '#8B5CF6', // purple
      call: '#F59E0B', // amber
      booking: '#059669', // emerald
      error: '#EF4444' // red
    };
    return colors[type];
  }

  log(type: LogEntry['type'], message: string, data?: any) {
    const entry = this.createLogEntry(type, message, data);
    this.logs.push(entry);
    
    const color = this.getColorForType(type);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    console.log(
      `%c[${timestamp}] ${type.toUpperCase()}: ${message}`,
      `color: ${color}; font-weight: bold;`
    );
    
    if (data) {
      console.log(`%cData:`, `color: ${color};`, data);
    }
  }

  gps(message: string, data?: any) {
    this.log('gps', message, data);
  }

  search(message: string, data?: any) {
    this.log('search', message, data);
  }

  llm(message: string, data?: any) {
    this.log('llm', message, data);
  }

  call(message: string, data?: any) {
    this.log('call', message, data);
  }

  booking(message: string, data?: any) {
    this.log('booking', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    console.clear();
  }
}

export const logger = new Logger();