from fastapi import APIRouter


router = APIRouter()



@router.get("/profile")
def profile():

    return {

        "skills":[
            "Python",
            "Machine Learning"
        ],

        "experience":[],
        
        "education":[]

    }