// import { Module } from '@nestjs/common';
// import { ClientsModule, Transport } from '@nestjs/microservices';
// import { AUTH_SERVICE } from './constants';

// @Module({
//   imports: [
//     ClientsModule.register([
//       {
//         name: AUTH_SERVICE,
//         transport: Transport.TCP,
//         options: {
//           host: process.env.AUTH_SERVICE_HOST || 'localhost',
//           port: parseInt(process.env.AUTH_SERVICE_PORT, 10) || 3001,
//         },
//       },
//     ]),
//   ],
//   exports: [ClientsModule],
// })
// export class AuthClientModule {}