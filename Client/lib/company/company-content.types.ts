export interface CompanyTextSection {
  title: string
  content: string
}

export interface CompanyAboutSection {
  mission: string
  vision: string
  values: string[]
}

export interface CompanyFaqItem {
  question: string
  answer: string
}

export interface CompanyContent {
  privacyPolicy: CompanyTextSection
  termsAndConditions: CompanyTextSection
  about: CompanyAboutSection
  faqs: CompanyFaqItem[]
  createdAt?: string
  updatedAt?: string
}

export interface UpdateCompanyContentInput {
  privacyPolicy?: Partial<CompanyTextSection>
  termsAndConditions?: Partial<CompanyTextSection>
  about?: Partial<CompanyAboutSection>
  faqs?: CompanyFaqItem[]
}
