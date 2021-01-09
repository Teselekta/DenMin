import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Http2ServerRequest } from 'http2';
import { DateTime, Duration, Interval } from 'luxon';
import { start } from 'repl';
import Performer from 'src/performers/performers.entity';
import {
  Repository,
  getRepository,
  createConnection,
  getConnection,
  getManager,
  Connection,
  Equal,
} from 'typeorm';
import { Appointment } from './appointment.entity';
import CreateAppointmentDto from './dto/createAppointment.dto';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Performer)
    private readonly performersRepository: Repository<Performer>,
  ) {}
  async bookAppointment(
    userID: number,
    performerID: number,
    appointmentData: CreateAppointmentDto,
  ) {
    try {
      const performer = await this.performersRepository.findOne(performerID);
      if (performer) {
        let duration = JSON.parse(JSON.stringify(performer.duration));
        duration = Duration.fromObject({
          hours: duration.hours,
          minutes: duration.minutes,
        });

        let pause = JSON.parse(JSON.stringify(performer.pause));
        pause = Duration.fromObject({
          hours: pause.hours,
          minutes: pause.minutes,
        });

        const startOfDay = DateTime.fromObject({
          hour: DateTime.fromISO(
            JSON.parse(JSON.stringify(performer.startOfDay)),
          ).toObject().hour,
          minute: DateTime.fromISO(
            JSON.parse(JSON.stringify(performer.startOfDay)),
          ).toObject().minute,
          zone: 'utc',
        });

        const endOfDay = DateTime.fromObject({
          hour: DateTime.fromISO(
            JSON.parse(JSON.stringify(performer.endOfDay)),
          ).toObject().hour,
          minute: DateTime.fromISO(
            JSON.parse(JSON.stringify(performer.endOfDay)),
          ).toObject().minute,
          zone: 'utc',
        });

        const appointmentDay = DateTime.fromObject({
          year: DateTime.fromISO(appointmentData.appointmentDay).toObject()
            .year,
          month: DateTime.fromISO(appointmentData.appointmentDay).toObject()
            .month,
          day: DateTime.fromISO(appointmentData.appointmentDay).toObject().day,
        }).toISODate();

        const appointmentTime = DateTime.fromObject({
          hour: DateTime.fromISO(appointmentData.appointmentTime).toObject()
            .hour,
          minute: DateTime.fromISO(appointmentData.appointmentTime).toObject()
            .minute,
          zone: 'utc',
        });

        const appointmentLastsUntil = appointmentTime.plus({
          hour: duration.hours + pause.hours,
          minute: duration.minutes + pause.minutes,
        });

        let appointments = await getRepository(Appointment)
          .createQueryBuilder('appointment')
          .where('appointment.performerID = :id', { id: performerID })
          .getMany();
        if (Object.entries(appointments).length !== 0) {
          appointments = appointments.filter(function(appointment) {
            return (
              appointment.appointmentDay.toString() ==
              appointmentData.appointmentDay
            );
          });
          const iterator = appointments.values();
          for (const value of iterator) {
            const performerAppointmentsTime = DateTime.fromObject({
              hour: DateTime.fromISO(
                JSON.parse(JSON.stringify(value.appointmentTime)),
              ).toObject().hour,
              minute: DateTime.fromISO(
                JSON.parse(JSON.stringify(value.appointmentTime)),
              ).toObject().minute,
              zone: 'utc',
            });

            const performerAppointmentsLastsUntil = DateTime.fromObject({
              hour: DateTime.fromISO(
                JSON.parse(JSON.stringify(value.appointmentLastsUntil)),
              ).toObject().hour,
              minute: DateTime.fromISO(
                JSON.parse(JSON.stringify(value.appointmentLastsUntil)),
              ).toObject().minute,
              zone: 'utc',
            });
            if (
              Interval.fromDateTimes(
                performerAppointmentsTime,
                performerAppointmentsLastsUntil,
              ).contains(appointmentTime) ||
              Interval.fromDateTimes(
                performerAppointmentsTime,
                performerAppointmentsLastsUntil,
              ).contains(appointmentLastsUntil) || 
              !Interval.fromDateTimes(startOfDay, endOfDay).contains(appointmentTime)
            ) {
              throw new HttpException(
                'You can not appoint current time, please try another time',
                HttpStatus.BAD_REQUEST,
              );
                  } else {
                      await getConnection()
                      .createQueryBuilder()
                      .insert()
                      .into(Appointment)
                      .values([
                          { appointmentDay: appointmentDay, appointmentTime: appointmentTime.toISOTime(), appointmentLastsUntil: appointmentLastsUntil.toISOTime(), performerID: performerID, userID: userID }
                      ])
                      .execute()
                      const appointmentFullData = {
                          userID: Number(userID),
                          performerID: Number(performerID),
                          appointmentDay: appointmentDay,
                          appointmentTime: appointmentTime.toISOTime(),
                          appointmentLastsUntil: appointmentLastsUntil
                      }
                      return appointmentFullData
              }
            
          } 
          // await getConnection()
          //   .createQueryBuilder()
          //   .insert()
          //   .into(Appointment)
          //   .values([
          //     {
          //       appointmentDay: appointmentDay,
          //       appointmentTime: appointmentTime.toISOTime(),
          //       appointmentLastsUntil: appointmentLastsUntil.toISOTime(),
          //       performerID: performerID,
          //       userID: userID,
          //     },
          //   ])
          //   .execute();
          // const appointmentFullData = {
          //   userID: Number(userID),
          //   performerID: Number(performerID),
          //   appointmentDay: appointmentDay,
          //   appointmentTime: appointmentTime.toISOTime(),
          //   appointmentLastsUntil: appointmentLastsUntil,
          // };
          // return appointmentFullData;
        } else { 
          if (!Interval.fromDateTimes(startOfDay, endOfDay).contains(appointmentTime)) {
            throw new HttpException(
              'You can not appoint current time, please try another time',
              HttpStatus.BAD_REQUEST,
            );
          }
          await getConnection()
            .createQueryBuilder()
            .insert()
            .into(Appointment)
            .values([
              {
                appointmentDay: appointmentDay,
                appointmentTime: appointmentTime.toISOTime(),
                appointmentLastsUntil: appointmentLastsUntil.toISOTime(),
                performerID: performerID,
                userID: userID,
              },
            ])
            .execute();
          const appointmentFullData = {
            userID: Number(userID),
            performerID: Number(performerID),
            appointmentDay: appointmentDay,
            appointmentTime: appointmentTime.toISOTime(),
            appointmentLastsUntil: appointmentLastsUntil,
          };
          return appointmentFullData;
        }
      } else if (!performer) {
        throw new HttpException(
          'Performer does not exist',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(`${error}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getById(id: number) {
    const appointment = await this.appointmentRepository.findOne(id);
    if (appointment) {
      return appointment;
    }
    throw new HttpException('Appointment not found', HttpStatus.BAD_REQUEST);
  }

  async getAllAppointments() {
    return this.appointmentRepository.find();
  }

  async getMyAppointments(userID: number) {
    const appointments = await getRepository(Appointment)
      .createQueryBuilder('appointment')
      .where('appointment.performerID = :id OR appointment.userID = :id', {
        id: userID,
      })
      .getMany();
    if (Object.entries(appointments).length !== 0) {
      return appointments;
    }
    throw new HttpException('There is no appointments', HttpStatus.NOT_FOUND);
  }

  async getFreePerformers() {
    const performers = (await this.performersRepository.find()).values()
    for (const performer of performers) {
      let duration = JSON.parse(JSON.stringify(performer.duration));
        duration = Duration.fromObject({
          hours: duration.hours,
          minutes: duration.minutes,
        }).minutes

        let pause = JSON.parse(JSON.stringify(performer.pause));
        pause = Duration.fromObject({
          hours: pause.hours,
          minutes: pause.minutes,
        }).minutes

        const workTime = Duration.fromObject({
          minutes: duration + pause
        }).minutes

        console.log('Work Time:',workTime)

        const appointments = await getRepository(Appointment) 
        .createQueryBuilder('appointment')
        .where('appointment.performerID= :performerID', {performerID: performer.id})
        .getMany()
        console.log(appointments)
    }
  }
}
