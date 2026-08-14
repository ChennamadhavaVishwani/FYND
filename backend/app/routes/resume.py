from fastapi import APIRouter, UploadFile, File


from app.services.resume_parser import parse_resume



router = APIRouter()



@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...)
):

    content = await file.read()


    result = parse_resume(
        content,
        file.filename
    )


    return {

        "filename":file.filename,

        "analysis":result

    }