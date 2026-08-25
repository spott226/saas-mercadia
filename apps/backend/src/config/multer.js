const multer = require("multer");
const cloudinary = require("./cloudinary");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

class CloudinaryStorage{
  _handleFile(req, file, callback){
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: "mercadia/products",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"]
      },
      (error, result) => {
        if(error){
          return callback(error);
        }

        callback(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes
        });
      }
    );

    file.stream.pipe(upload);
  }

  _removeFile(req, file, callback){
    if(!file.filename){
      return callback(null);
    }

    cloudinary.uploader.destroy(
      file.filename,
      error => callback(error || null)
    );
  }
}

const upload = multer({
  storage: new CloudinaryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 8,
    fields: 50
  },
  fileFilter(req, file, callback){
    if(!allowedMimeTypes.has(file.mimetype)){
      return callback(
        new multer.MulterError(
          "LIMIT_UNEXPECTED_FILE",
          file.fieldname
        )
      );
    }

    callback(null, true);
  }
});

module.exports = upload;
