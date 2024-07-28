/**
 * GET/
 * Homepage
 */
exports.homepage = async (req, res) => {
    const locals = {
      title: "NodeJs Notes",
      description: "Free NodeJS Notes App.",
    }
    res.render('index',{
      locals,
      layout:'../views/layouts/frontpage'
    });
  }
/**
 * GET/
 * about
 */
exports.about=async(req,res)=>{
    const locals={
        title:'About -NodeJs Notes',
        description:"Free NodeJs note app",
    }
    res.render('about',locals); 
}