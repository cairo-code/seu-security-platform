import { prisma } from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function generateCertificate(
  userId: string,
  pathId: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, universityId: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const path = await prisma.path.findUnique({
    where: { id: pathId },
    select: { title: true },
  });

  if (!path) {
    throw new Error('Path not found');
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([841, 595]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const borderColor = rgb(0.102, 0.102, 0.18);
  for (let i = 1; i <= 4; i++) {
    page.drawRectangle({
      x: i * 10,
      y: i * 10,
      width: width - i * 20,
      height: height - i * 20,
      borderColor,
      borderWidth: 1,
    });
  }

  const titleText = 'Certificate of Completion';
  const titleSize = 36;
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
  page.drawText(titleText, {
    x: (width - titleWidth) / 2,
    y: height / 2 + 60,
    size: titleSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  const bodyText = `This certifies that ${user.name} (ID: ${user.universityId}) has successfully completed the path "${path.title}"`;
  const bodySize = 18;
  const bodyWidth = font.widthOfTextAtSize(bodyText, bodySize);
  page.drawText(bodyText, {
    x: (width - bodyWidth) / 2,
    y: height / 2,
    size: bodySize,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const footerText = `SEU Playground · ${date}`;
  const footerSize = 12;
  const footerWidth = font.widthOfTextAtSize(footerText, footerSize);
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: 40,
    size: footerSize,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();

  const publicId = `cert-${userId}-${pathId}`;

  const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'seu-certificates',
        public_id: publicId,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('Upload failed'));
        }
      }
    );
    uploadStream.end(pdfBytes);
  });

  await prisma.certificate.upsert({
    where: {
      userId_pathId: {
        userId,
        pathId,
      },
    },
    create: {
      userId,
      pathId,
      cloudinaryUrl: uploadResult.secure_url,
    },
    update: {
      cloudinaryUrl: uploadResult.secure_url,
      generatedAt: new Date(),
    },
  });

  return uploadResult.secure_url;
}