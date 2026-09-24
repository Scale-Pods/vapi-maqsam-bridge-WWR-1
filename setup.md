2. Create the Cloud Run service (Console)
Go to console.cloud.google.com → Cloud Run → Create Service.
Choose "Continuously deploy new revisions from a source repository".
Click Set up with Cloud Build → authenticate/connect GitHub if not already → select repo Scale-Pods/vapi-maqsam-bridge-WWR-1, branch main.
Build type: it should auto-detect the Dockerfile in the repo root. Confirm build config = Dockerfile.
Service name: e.g. vapi-maqsam-bridge.
Region: pick one close to your callers (original used europe-west1).
Authentication: select "Allow unauthenticated invocations" — Vapi calls this webhook without Google auth.
CPU/Memory: defaults are fine (256Mi–512Mi, 1 vCPU) for this light workload.
3. Set environment variables
Still in the same Create Service screen, expand Container(s), Volumes, Networking, Security → Variables & Secrets tab → Add Variable for each:

SUPABASE_URL
SUPABASE_KEY
VAPI_ASSISTANT_ID
For SUPABASE_KEY specifically (it's a service-role key), prefer Reference a secret instead of a plain variable:

First go to Secret Manager (separate page) → Create Secret → name it supabase-key → paste the value.
Back in Cloud Run's Variables & Secrets tab, choose "Reference a secret" instead of plain env var, point it at supabase-key, mount as env var SUPABASE_KEY.
Grant the Cloud Run service's runtime service account the Secret Manager Secret Accessor role if prompted (Console usually offers to do this automatically).
4. Deploy
Click Create. Cloud Build will pull your repo, build the Docker image, push it to Artifact Registry, and deploy to Cloud Run. First build takes a few minutes. You'll get a URL like:


https://vapi-maqsam-bridge-xxxxx-ew.a.run.app
5. Point Vapi at it
In Vapi → phone number settings → Server URL:


https://<your-cloud-run-url>/assistant-selector
Leave the assistant field blank (per your original imp.txt note).

6. Verify
Cloud Run → your service → Logs tab. Make a test call and watch for:


[Result] Phone: +971... -> Name: <FirstName or "Not Found">
7. Future updates
Since it's connected as continuous deploy, any push to main auto-triggers a new Cloud Build + Cloud Run revision — no manual redeploy needed going forward.