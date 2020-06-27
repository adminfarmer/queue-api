/// <reference path="../../typings.d.ts" />

import * as knex from 'knex';
import * as fastify from 'fastify';
import * as moment from 'moment';

import * as HttpStatus from 'http-status-codes';
import { QueueModel } from '../models/queue';
import { HiModel } from '../models/his/hi';

var QRCode = require('qrcode');

const queueModel = new QueueModel();
const hiModel = new HiModel();

const router = (fastify, { }, next) => {

  var dbHIS: knex = fastify.dbHIS;
  var db: knex = fastify.db;

  fastify.get('/queue', async (req: fastify.Request, reply: fastify.Reply) => {
    const queueId: any = req.query.queueId;

    if (queueId) {

      try {

        const rs: any = await queueModel.getPrintInfo(db, queueId);

        if (rs[0].length) {
          const info: any = rs[0][0];
          const hosname: any = info.hosname;
          const hosid: any = info.hosid;
          const queueNumber: any = info.queue_number;
          const queueInterview: any = info.queue_interview;

          const queueWithoutPrefix = +info.queue_running;

          const servicePointName: any = info.service_point_name;
          const remainQueue: any = info.remain_queue || 0;
          const hn: any = info.hn;
          const vn: any = info.vn;
          const priorityName: any = info.priority_name;
          const dateServ: any = moment(info.date_serv).format('YYYYMMDD');
          const timeServ: any = moment(info.time_serv, 'HH:mm:ss').format('HHmm');
          const dateCreated: any = moment(info.date_create).locale('th').format('DD/MM/YYYY HH:mm');
          const localCode: any = info.local_code;
          const qrcode = await QRCode.toDataURL(`${hosid}#${process.env.Q4U_NOTIFY_TOKEN}#${hn}#${localCode}#${queueNumber}#${queueWithoutPrefix}#${dateServ}#${timeServ}#${servicePointName}#${priorityName}`);

          // var templateDir = path.join(__dirname, '../templates/queue-qrcode.ejs');
          // console.log(templateDir);

          reply.view('queue-qrcode.ejs', {
            qrcode: qrcode,
            hosname: hosname,
            queueNumber: queueNumber,
            hn: hn,
            vn: vn,
            dateCreated: dateCreated,
            servicePointName: servicePointName,
            remainQueue: remainQueue,
            priorityName: priorityName,
            queueId: queueId,
            queueInterview: queueInterview
          });

        } else {
          reply.status(HttpStatus.OK).send({ statusCode: HttpStatus.BAD_REQUEST, message: 'ไม่พบรหัสคิวที่ต้องการ' })
        }

      } catch (error) {
        reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR) })
      }

    } else {
      reply.status(HttpStatus.OK).send({ statusCode: HttpStatus.BAD_REQUEST, message: 'ไม่พบรหัสคิวที่ต้องการ' })
    }

  });

  fastify.post('/queue/prepare/print', async (req: fastify.Request, reply: fastify.Reply) => {
    const queueId: any = req.body.queueId;
    const topic = req.body.topic;
    const printSmallQueue = req.body.printSmallQueue || 'N';

    if (queueId && topic) {
      try {
        const rs: any = await queueModel.getPrintInfo(db, queueId);

        if (rs[0].length) {
          const info: any = rs[0][0];
          const hosname: any = info.hosname;
          const hosid: any = info.hosid;
          const queueNumber: any = info.queue_number;
          const queueWithoutPrefix = +info.queue_running;

          const servicePointName: any = info.service_point_name;
          const remainQueue: any = info.remain_queue || 0;
          const hn: any = info.hn;
          const vn: any = info.vn;
          const firstName: any = info.first_name;
          const lastName: any = info.last_name;
          const queueInterview = info.queue_interview;
          const priorityName: any = info.priority_name;
          const dateServ: any = moment(info.date_serv).format('YYYYMMDD');
          const timeServ: any = moment(info.time_serv, "HH:mm:ss").format('HHmm');
          const dateCreated: any = moment(info.date_create).locale('th').format('DD/MM/YYYY HH:mm');
          const localCode: any = info.local_code;
          const qrcode = `${hosid}#${process.env.Q4U_NOTIFY_TOKEN}#${hn}#${localCode}#${queueNumber}#${queueWithoutPrefix}#${dateServ}#${timeServ}#${servicePointName}#${priorityName}`;

          const pt: any = await hiModel.getPatientInfoPttype(dbHIS, hn);
          let namepttype = pt[0].namepttype;

          var data: any = {
            "printSmallQueue": printSmallQueue,
            "hn": hn,
            "firstName": firstName,
            "lastName": lastName,
            "qrcode": qrcode,
            "namepttype": namepttype,
            "hosname": hosname,
            "queueNumber": queueNumber,
            "servicePointName": servicePointName,
            "remainQueue": remainQueue,
            "priorityName": priorityName,
            "queueInterview": queueInterview
          };

          reply.status(HttpStatus.OK).send({ statusCode: HttpStatus.OK });
          fastify.mqttClient.publish(topic, JSON.stringify(data), { qos: 0, retain: false });

        } else {
          reply.status(HttpStatus.OK).send({ statusCode: HttpStatus.BAD_REQUEST, message: 'ไม่พบรหัสคิวที่ต้องการ' })
        }

      } catch (error) {
        reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR) })
      }

    } else {
      reply.status(HttpStatus.OK).send({ statusCode: HttpStatus.BAD_REQUEST, message: 'ไม่พบรหัสคิวที่ต้องการ' })
    }

  });

  //Ubonket10 
  fastify.get('/queue-his', async (req: fastify.Request, reply: fastify.Reply) => {
    const queueId: any = req.query.queueId;

    if (queueId) {

      try {

        const rs: any = await queueModel.getPrintHisInfo(db, queueId);

        if (rs[0].length) {
          const info: any = rs[0][0];
          const hosname: any = info.hosname;
          const hosid: any = info.hosid;
          const queueNumber: any = info.queue_number;

          // queue without prefix
          const prefixLength = 2;
          const digiLength = +process.env.QUEUE_DIGIT || 3;
          const totalLength = prefixLength + digiLength;

          const queueWithoutPrefix = +queueNumber.substring(prefixLength, totalLength);

          const servicePointName: any = info.service_point_name;
          const remainQueue: any = info.remain_queue || 0;
          const hn: any = info.hn;
          const vn: any = info.vn;
          const title: any = info.title;
          const firstName: any = info.first_name;
          const lastName: any = info.last_name;
          const priorityName: any = info.priority_name;
          const dateServ: any = moment(info.date_serv).format('YYYYMMDD');
          const timeServ: any = moment(info.time_serv, "HH:mm:ss").format('HHmm');
          const dateCreated: any = moment(info.date_create).locale('th').format('DD/MM/YYYY HH:mm');
          const localCode: any = info.local_code;
          const qrcode = `${hosid}#${process.env.Q4U_NOTIFY_TOKEN}#${hn}#${localCode}#${queueNumber}#${queueWithoutPrefix}#${dateServ}#${timeServ}#${servicePointName}#${priorityName}`;
          // const qrcode = await QRCode.toDataURL(`${hosid}#${process.env.Q4U_NOTIFY_TOKEN}#${hn}#${localCode}#${queueNumber}#${queueWithoutPrefix}#${dateServ}#${timeServ}#${servicePointName}#${priorityName}`);

          reply.status(HttpStatus.OK).send({
            qrcode: qrcode,
            hosname: hosname,
            queueNumber: queueNumber,
            hn: hn,
            vn: vn,
            title: title,
            firstName: firstName,
            lastName: lastName,
            dateCreated: dateCreated,
            servicePointName: servicePointName,
            remainQueue: remainQueue,
            priorityName: priorityName,
            queueId: queueId
          });

        } else {
          reply.status(HttpStatus.OK).send({ statusCode: HttpStatus.BAD_REQUEST, message: 'ไม่พบรหัสคิวที่ต้องการ' })
        }

      } catch (error) {
        reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR) })
      }

    } else {
      reply.status(HttpStatus.OK).send({ statusCode: HttpStatus.BAD_REQUEST, message: 'ไม่พบรหัสคิวที่ต้องการ' })
    }

  });

  fastify.get('/qrcode', async (req: fastify.Request, reply: fastify.Reply) => {
    reply.send('ok')
  });

  next();

}

module.exports = router;