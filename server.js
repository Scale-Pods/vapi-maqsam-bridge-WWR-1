require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json({ limit: "5mb" }));

// 🔧 CONFIG
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

// 🔐 DB CONFIG
const TABLE = "outreach_table";
const NAME_COLUMN = "full_name";
const PHONE_COLUMN = "phone";
const SELECT_COLUMNS = `${NAME_COLUMN}, ${PHONE_COLUMN}, property_type, property_category, crm_id, lead_id`;

// 🔐 AUTH
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Looks up a lead in outreach_table by phone number.
 * outreach_table.phone is stored as digits only (no +), so the incoming
 * Vapi number is stripped of all non-digit characters before matching.
 */
async function getLead(phoneNumber) {
  if (!phoneNumber) return null;

  try {
    const cleaned = phoneNumber.replace(/\D/g, "");
    console.log("CLEANED INPUT:", cleaned);

    const { data, error } = await supabase
      .from(TABLE)
      .select(SELECT_COLUMNS)
      .eq(PHONE_COLUMN, cleaned)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`[DB Error] ${TABLE}:`, error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("[Critical Error]:", err);
    return null;
  }
}

app.post("/assistant-selector", async (req, res) => {
  try {
    if (req.body.message?.type === "assistant-request") {
      const phoneNumber = req.body.message?.call?.customer?.number;
      console.log(`[${new Date().toISOString()}] Incoming Request: ${phoneNumber}`);

      const lead = await Promise.race([
        getLead(phoneNumber),
        new Promise(resolve => setTimeout(() => resolve(null), 2000))
      ]);
      const firstName = lead?.[NAME_COLUMN] ? lead[NAME_COLUMN].trim().split(" ")[0] : null;
      console.log(`[Result] Phone: ${phoneNumber} -> Name: ${firstName || "Not Found"}`);
      console.log("[Lead Data]", JSON.stringify(lead));

      res.json({
        assistantId: ASSISTANT_ID,
        assistantOverrides: {
          variableValues: {
            customerName: firstName || "there",
            propertyType: lead?.property_type || "",
            propertyCategory: lead?.property_category || "",
            crmId: lead?.crm_id || "",
            leadId: lead?.lead_id || ""
          }
        }
      });
    } else {
      res.status(200).send("OK");
    }
  } catch (err) {
    console.error("[Server Error]:", err);

    res.json({
      assistantId: ASSISTANT_ID,
      assistantOverrides: {
        variableValues: {
          customerName: "there"
        }
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
