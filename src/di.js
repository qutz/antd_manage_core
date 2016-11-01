import inversify from 'inversify';
import 'reflect-metadata';

const kernel = new inversify.Kernel();

export default class DI {
  static get(key) {
    return kernel.get(key);
  }

  static bind(key, value) {
    kernel.bind(key).to(value).inSingletonScope();
    return this;
  }

  static bindValue(key, value) {
    kernel.bind(key).toConstantValue(value);
    return this;
  }

  static bindFactory(key, value) {
    kernel.bind(key).toFactory(value);
    return this;
  }

  static getKernel() {
    return kernel;
  }
}