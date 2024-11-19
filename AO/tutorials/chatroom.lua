Members = Members or {}

Handlers.add(
    "Register",
    Handlers.utils.hasMatchingTag("Action", "Register"),
    function (msg) 
        table.insert(Members, msg.From)
        Handlers.utils.reply("registered")(msg)
    end
)

Handlers.add(
    "Broadcast",
    Handlers.utils.hasMatchingTag("Action", "Broadcast"),
    function (msg)
        for _, recipient in ipairs(Members) do
            ao.send({ Target = recipient, Data = msg.Data })
        end
        Handlers.utils.reply("Broadcasted successfullly")(msg)
    end
)