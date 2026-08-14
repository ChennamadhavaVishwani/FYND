from fastapi import APIRouter


router = APIRouter()



@router.get("/recommendations")
def recommendations():

    return {

        "jobs":[

            {
                "title":"Machine Learning Engineer",
                "company":"Example Company"
            },

            {
                "title":"Backend Developer",
                "company":"Example Company"
            }

        ]

    }