const SYTEX_QUERY_URL= process.env.UFINET_BASEURL + "/api/form/?" //?template=286&q=FLV01-A12-P06S3-C03
const SYTEX_BASE_URL = process.env.UFINET_BASEURL
const SYTEX_TOKEN = process.env.UFINET_TOKEN


export const config = {
    runtime: 'edge',
  };
  
const apiSytext= {
  get: async (template, node) => {
    const sytexHeaders = new Headers();
    sytexHeaders.append('Authorization','Token ' + SYTEX_TOKEN);
    sytexHeaders.append('Content-Type', 'application/json');
    const queryUrl = SYTEX_QUERY_URL + new URLSearchParams({template: template, q : node})

//    console.log("QueryURL inside promise: " + queryUrl +  "\nToken: " + SYTEX_TOKEN)

    return await fetch(queryUrl, {headers: sytexHeaders, mode: 'no-cors'})
      .then((response) => {
        if (response.ok) return response.json();
        else return null
      })
      .catch(() => {return null})
  }
}

function parseMultipleResults(sytexResults,ro){
  var retVal=""
  for (var thisForm of sytexResults.results){
    if (ro){
      retVal+=`<li><a href='${SYTEX_BASE_URL}/d/f/${thisForm.uuid}'>${thisForm.network_element.name} - ${thisForm.status.name}</a></li>`
    } else {
      retVal+=`<li><a href='${SYTEX_BASE_URL}/o/${thisForm.organization.id}${thisForm._url_display}'>${thisForm.network_element.name} - ${thisForm.status.name}</a></li>`
    }
    
  }
  return retVal
}

export default async function (req) {
  const myUrl = new URL(req.url).searchParams;
  var myResponse=null

  //console.log("url: " + SYTEX_QUERY_URL)
  //console.log("token: " + SYTEX_TOKEN)
  
  const myTemplateType = myUrl.get('templateid');
  const myName = myUrl.get('nename');
  const myRo = myUrl.get('ro');

  //console.log("template: " + myTemplateType + "\n name: " + myName)

  if (myTemplateType && myTemplateType.match(/^\d+$/) && myName && myName.match(/^[A-Z0-9\-]+$/)){
    const sytextResponse = await apiSytext.get(myTemplateType,myName)

    if (sytextResponse===null){
      myResponse = new Response(`Hello, from ${req.url} - failed query`,{'status':408})
    }
    else if (sytextResponse.count==0){
      myResponse = new Response(`Hello, from ${req.url} - No results found`, {'status':404})
    }
    else if (sytextResponse.count==1){
      if (sytextResponse.results[0]._url_display){
        if (!myRo){
          myResponse = Response.redirect(SYTEX_BASE_URL+"/o/"+sytextResponse.results[0].organization.id + sytextResponse.results[0]._url_display)
        } else {
          myResponse = Response.redirect(SYTEX_BASE_URL+"/d/f/" + sytextResponse.results[0].uuid)
        }
      }
      else {
        myResponse = new Response(`Hello, from ${req.url} - missing UUID`)
      }
    }
    else{
      const myHeaders=new Headers()
      myHeaders.append('Content-Type', 'text/html');
      myResponse= new Response(`Multiples posibles opciones\nElija:\n${parseMultipleResults(sytextResponse,myRo)}`, {headers:myHeaders});
    }
  } else {
    myResponse = new Response(`Hello, from ${req.url} - invalid query parameters`,{'status':400})
  }

  return myResponse
};

