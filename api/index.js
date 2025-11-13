const SYTEX_QUERY_URL= process.env.UFINET_BASEURL + "/api/" //?template=286&q=FLV01-A12-P06S3-C03
const SYTEX_BASE_URL = process.env.UFINET_BASEURL
const SYTEX_TOKEN = process.env.UFINET_TOKEN


export const config = {
    runtime: 'edge',
  };
  
const apiSytext= {
  get: async (path,queryObj) => {
    const sytexHeaders = new Headers();
    sytexHeaders.append('Authorization','Token ' + SYTEX_TOKEN);
    sytexHeaders.append('Content-Type', 'application/json');
    const queryUrl = SYTEX_QUERY_URL + path + '/?' + new URLSearchParams(queryObj)

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
      retVal+=`<li><a href='${SYTEX_BASE_URL}/o/${thisForm.organization}${thisForm._url_display}'>${thisForm.network_element.name} - ${thisForm.status.name}</a></li>`
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
    const sytextResponseNE = await apiSytext.get('networkelement/reduced',{code: myName})

    if (sytextResponseNE===null){
      myResponse = new Response(`Hello, from ${req.url} - failed NE query`,{'status':408})
    }
    else if (sytextResponseNE.count==0){
      myResponse = new Response(`Hello, from ${req.url} - No NE results found`, {'status':404})
    }
    else if (sytextResponseNE.count==1){
      const sytextResponseForm = await apiSytext.get('form',{template:myTemplateType, network_element:sytextResponseNE.results[0].id})
      if (sytextResponseForm===null){
        myResponse = new Response(`Hello, from ${req.url} - failed FORM query`,{'status':408})
      }
      else if (sytextResponseForm.count==0){
        myResponse = new Response(`Hello, from ${req.url} - No FORM results found`, {'status':404})
      }
      else if (sytextResponseForm.count==1){
        if (sytextResponseForm.results[0]._url_display){
          if (!myRo){
            myResponse = Response.redirect(SYTEX_BASE_URL+"/o/"+sytextResponseForm.results[0].organization + sytextResponseForm.results[0]._url_display)
          } else {
            myResponse = Response.redirect(SYTEX_BASE_URL+"/d/f/" + sytextResponseForm.results[0].uuid)
          }
        }
        else {
          myResponse = new Response(`Hello, from ${req.url} - FORM result missing UUID`)
        }
      }
      else{
        const myHeaders=new Headers()
        myHeaders.append('Content-Type', 'text/html');
        myResponse= new Response(`Multiples posibles opciones\nElija:\n${parseMultipleResults(sytextResponse,myRo)}`, {headers:myHeaders});
      }
    } else {
      myResponse = new Response(`Hello, from ${req.url} - NE query failed or returned too many results`)
    }
  } else {
    myResponse = new Response(`Hello, from ${req.url} - invalid query parameters`,{'status':400})
  }

  return myResponse
};

