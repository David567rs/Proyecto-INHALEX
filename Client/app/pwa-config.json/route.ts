import {
  CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_HREF,
  CONTACT_CITY, CONTACT_ADDRESS, CONTACT_HOURS,
} from "@/lib/company/contact-info"

export const dynamic = "force-static"

export function GET() {
  // Only public company data. Never add session or environment secrets here.
  return Response.json({
    contact: {
      email: CONTACT_EMAIL, phone: CONTACT_PHONE_DISPLAY, phoneHref: CONTACT_PHONE_HREF,
      city: CONTACT_CITY, address: CONTACT_ADDRESS, hours: CONTACT_HOURS,
    },
  })
}
