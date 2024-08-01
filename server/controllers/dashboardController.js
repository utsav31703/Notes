const Note = require("../models/Notes");
const mongoose = require("mongoose");
const crypto = require('crypto');

const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encrypt(text) {
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}


/**
 * GET /
 * Dashboard
 */
exports.dashboard = async (req, res) => {

  let perPage = 12;
  let page = req.query.page || 1;

  const locals = {
    title: "Dashboard",
    description: "Free NodeJS Notes App.",
  };


  try {
/*  
    inserting the dummy notes inside the mongodb
*/ 
    // const sampleNotes = [
    //   {
    //     title: 'First Note',
    //     body: 'This is the body of the first note. It contains multiple lines of text to simulate a real note.\n\nLine 2 of the note.\n\nLine 3 of the note.\n\nLine 4 of the note.\n\nLine 5 of the note.\n\nLine 6 of the note.\n\nLine 7 of the note.\n\nLine 8 of the note.',
    //     user: new mongoose.Types.ObjectId(req.user.id),
    //   },
    //   {
    //     title: 'Second Note',
    //     body: 'This is the body of the second note. It also contains several lines of text for testing purposes.\n\nLine 2 of the second note.\n\nLine 3 of the second note.\n\nLine 4 of the second note.\n\nLine 5 of the second note.\n\nLine 6 of the second note.',
    //     user: new mongoose.Types.ObjectId(req.user.id),
    //   },
    //   {
    //     title: 'Third Note',
    //     body: 'This is the body of the third note. Adding more content to ensure we have enough data.\n\nLine 2 of the third note.\n\nLine 3 of the third note.\n\nLine 4 of the third note.\n\nLine 5 of the third note.\n\nLine 6 of the third note.',
    //     user: new mongoose.Types.ObjectId(req.user.id),
    //   },
    //   {
    //     title: 'Fourth Note',
    //     body: 'This is the body of the fourth note. More lines to simulate real notes.\n\nLine 2 of the fourth note.\n\nLine 3 of the fourth note.\n\nLine 4 of the fourth note.\n\nLine 5 of the fourth note.\n\nLine 6 of the fourth note.',
    //     user: new mongoose.Types.ObjectId(req.user.id),
    //   },
    // ];
    // await Note.insertMany(sampleNotes)

    // Mongoose "^7.0.0 Update
    const notes = await Note.aggregate([
      { $sort: { updatedAt: -1 } },
      { $match: { user:new mongoose.Types.ObjectId(req.user.id) } },
      {
        $project: {
          title: { $substr: ["$title", 0, 30] },
          body: { $substr: ["$body", 0, 100] },
        },
      }
      ])
    .skip(perPage * page - perPage)
    .limit(perPage)
    .exec(); 

    const decryptedNotes = notes.map(note => ({
      ...note,
      body: decrypt(note.body),
  }));

    const count = await Note.countDocuments();

    res.render('dashboard/index', {
      userName: req.user.firstName,
      locals,
      notes: decryptedNotes,
      layout: "../views/layouts/dashboard",
      current: page,
      pages: Math.ceil(count / perPage)
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error"); // Better error handling
  }
};

/**
 * GET/
 * View Specific Note
 */

exports.dashboardViewNote=async(req,res)=>{
  const note=await Note.findById({ _id : req.params.id })
  .where({user: req.user.id }).lean();
  
  if(note){
    note.body = decrypt(note.body);
    res.render('dashboard/view-notes',{
      noteID:req.params.id,
      note,
      layout:'../views/layouts/dashboard'

    });
  } else{
    res.send("Something went wrong")
  }
  }
  
/**
 * PUT/
 * Update specific Note
 */


exports.dashboardUpdateNote=async(req,res)=>{
  
  try {
    const encryptedBody = encrypt(req.body.body);
    await Note.findOneAndUpdate(
      {_id:req.params.id},
      {title:req.body.title, body: encryptedBody, updatedAt: Date.now() }
    ).where({user:req.user.id});
  
    res.redirect('/dashboard')
  } catch (error) {
    console.log(error)
  }
}

/**
 * Delete/
 * Delete Note
 */
exports.dashboardDeleteNote=async(req,res)=>{

  try {
    await Note.deleteOne({_id:req.params.id}).where({user: req.user.id});
    res.redirect('/dashboard')
  } catch (error) {
    console.log(error);
  }
}

/**
 * GET/
 * Add Notes
 */
exports.dashboardAddNote = async(req,res)=>{
  res.render('dashboard/add',{
    layouts: '../views/layouts/dashboard'
  })
}
/**
 * POST/
 * Add Notes
 */
exports.dashboardAddNoteSubmit = async(req,res)=>{
  try {
    req.body.user = req.user.id;
    req.body.body = encrypt(req.body.body);

      await Note.create(req.body)
      res.redirect('/dashboard')
  } catch (error) {
    console.log(error)
  }
}
/**
 * GET/
 * Seacrh
 */
exports.dashboardSearch = async(req,res)=>{
  try {
    res.render('dashboard/search',{
      searchResults:'',
      layout:'../views/layouts/dashboard'
    })
  } catch (error) {
    
  }
}
/**
 * POST/
 * Seacrh for notes
 */
exports.dashboardSearchSubmit = async (req, res) => {
  try {
    let searchTerm = req.body.searchTerm;
    const searchNoSpecialChars = searchTerm.replace(/[^a-zA-Z0-9 ]/g, "");

    const searchResults = await Note.find({
      $or: [
        { title: { $regex: new RegExp(searchNoSpecialChars, "i") } },
        { body: { $regex: new RegExp(searchNoSpecialChars, "i") } },
      ],
    }).where({ user: req.user.id });

    const decryptedSearchResults = searchResults.map(note => ({
      ...note,
      body: decrypt(note.body),
  }));

    res.render("dashboard/search", {
       searchResults: decryptedSearchResults,
      layout: "../views/layouts/dashboard",
    });
  } catch (error) {
    console.log(error);
  }
};