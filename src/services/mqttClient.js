import AsyncStorage from '@react-native-async-storage/async-storage';

export async function connectMqtt({
  url = 'ws://test.mosquitto.org:8080/mqtt',
  topic,
  qos = 0,
  clientId = `luixxa-mobile-${Math.random().toString(16).slice(2)}`,
  keepalive = 30,
  onMessage,
}) {
  let mqttLib;
  try {
    mqttLib = require('mqtt');
  } catch (e) {
    throw new Error('Dependencia mqtt no instalada');
  }

  const saved = await AsyncStorage.getItem('iot_broker_settings');
  const settings = saved ? JSON.parse(saved) : {};
  const finalUrl = settings.brokerUrl || url;
  const finalTopic = Array.isArray(settings.topics) && settings.topics.length ? settings.topics[0] : topic;

  const options = {
    clientId,
    keepalive,
    clean: true,
    reconnectPeriod: 3000,
  };

  const client = mqttLib.connect(finalUrl, options);

  client.on('connect', () => {
    if (finalTopic) {
      client.subscribe(finalTopic, { qos }, () => {});
    }
  });

  client.on('message', (receivedTopic, payload) => {
    try {
      const text = payload.toString();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        const num = /-?\d+(?:\.\d+)?/.exec(text);
        const value = num ? parseFloat(num[0]) : null;
        data = { valor: value, nombre: receivedTopic, raw: text };
      }
      if (typeof onMessage === 'function') onMessage({ topic: receivedTopic, data });
    } catch (_) {}
  });

  client.on('error', () => {});

  const disconnect = () => {
    try {
      client.end(true);
    } catch (_) {}
  };

  return { client, disconnect };
}

export function publish(client, topic, message, options = {}) {
  if (!client) return;
  try {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    client.publish(topic, payload, options);
  } catch (_) {}
}

export function subscribe(client, topic, options = {}) {
  if (!client) return;
  try {
    client.subscribe(topic, options);
  } catch (_) {}
}

