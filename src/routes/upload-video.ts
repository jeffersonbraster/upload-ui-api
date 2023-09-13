import { FastifyInstance } from "fastify";
import {fastifyMultipart} from "@fastify/multipart"
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "fs";
import {pipeline} from "node:stream";
import { promisify } from "node:util";
import { prisma } from "../lib/prisma";


const pump = promisify(pipeline)

export async function uploadVideo(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25MB
    }
  })
  app.post('/videos', async (req, reply) => {
    const data = await req.file()

    if(!data) {
      return reply.status(400).send({
        error: 'Missing file input'
      })
    }

    const extension = path.extname(data.filename)

    if(extension !== '.mp3') {
      return reply.status(400).send({
        error: 'Invalid file extension, please upload a mp3 file'
      })
    }

    const fileBaseName = path.basename(data.filename, extension)

    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`

    const uploadDir = path.resolve(__dirname, '../../tmp',  fileUploadName)

    await pump(data.file, fs.createWriteStream(uploadDir))

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDir
      }
    })

    return {
      video
    }
  })
}