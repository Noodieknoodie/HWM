# YOUR JOB IS TO HELP ME GET FILE SERVICES UP AND RUNNING IN THIS APP

HOW:
- ask me to provide you with information / copy and pasted things whenever possible so that I can give you the essentials and you can do the coding 
- if you need me to do something on my own like set up Azure resources, then give instructions but do keep in mind you have the Azure MCP server 
- when it comes to SQL mods then write sql script for it 
- write the code correctly in the right spot when it comes time to implimentation, after studyuing and giving the gameplan 

---

# TASK / GOAL
## add "view files" to each client payment page 
 - accesses that specific clients sharepoint folder
 - folder paths will be in database minus the final folder which is YEAR (/YYYY) "/2025" - so the app side code will have to add that final folder dynamically based on the current year we are in. 
 - view files will display ONLY PDFS. shown as thumbnails, grouped by YEAR.

 2025
 -------------
 [file] [file] [file] 
 [file] [file] [file]
etc...

2024
---------------
 [file] [file] [file] 
 [file] [file] [file]
etc...


- clicking on a file DISPLAYS IT AS LARGE AS POSSIBLE WITHIN THE VIEWING AREA

// PLEASE CONFIRM THAT THE FILE VIEWER IS STILL PRESENT WITHIN THE CODEBASE BUT COMMENTED OUT
// IF ITS NO LONGER THERE... IT IS A SIDEBAR THAT PULLS IN FROM THE RIGHT. IT SHOULD BE ROUGHLY 40% OF THE VIEWPORT. THE REST OF THE APP ADJUSTS ELEGENTLY TO ACCOMIDATE THE RIGHT SIDEBAR WHILE ITS OPEN AND RETURNS TO NORMAL STATE WHEN CLOSED. PDF VIEWING SHOULD BE LARGE SO THAT YOU CAN READ SMALL NUMBERS ON CHECKS. NEED TO BE ABLE TO NAVIGATE FILES / GO BACK TO GRID MODE, ETC. 


## UI
- at the top of each clients payment page have two buttons [VIEW DOCUMENTS]


# ADD DOCUMENTS TAB
-- ADDING NEW TAB TO THE TOP BAR NAVIGATION: "ADD FILES"
-- supports multi document upload

this page contains:
- upload document(s) action
-- this displays a preview of the document / etc 

- PER DOCUMENT UPLOAD: states 1. recieved date 2. provider 
-- SMART CONFIG: based on recieved date and provider we can PRINT INTELLIGENT ESTIMATION AS TO WHAT CLIENT OR CLIENTS THE CHECK PAYS FOR
LOGIC: 
1. provider: links to client list. we start there. we can essentially filter down to there
2. THE UESR IS PRESENTED WITH: a condensed list of CLIENTS NAMES from within that provider with checkboxes next to each. All of them are checked ON by default. ITs the users job to uncheck whatever ones needed. for example, a check comes in from VOYA, this check only pays for 3 of the clients that they are the custodian for but they serve 5 of our clients in total. the user already sees the check and know who its for. so they would then uncheck the two clients in which the uploaded check is not for, resulting in the three clients that the check IS for.
2. recieved date: we can look back one month and one quarter from recieved date and figure what the APPLIED PERIOD is for both monthly and quarterly clients
3. we can check what the payment schedules are for the clients from that provider 
4. if they all are the same schedule (monthly or quarterly) then we can just use that term in the file name building. if it is a mix, then we do both.
5. we use the 'short_name' field from the client table in the sql DB to populate the file name. 

# FILE NAME CONFIGURATION:

set system 

{provider} - {cleint}, {cleint}, {cleint} - Advisor Fees - {period} & {period} 

example

VOYA - CGE, Belmont, FWH - Advisor Fees- Q1-24 & Feb-24