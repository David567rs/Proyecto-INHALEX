import { DEFAULT_COMPANY_CONTENT } from './data/default-company-content';
import { CompanyContentService } from './company-content.service';

function execResult<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

function buildContentDocument() {
  return {
    id: 'company-content-main',
    ...DEFAULT_COMPANY_CONTENT,
  };
}

describe('CompanyContentService', () => {
  let service: CompanyContentService;
  let companyContentModel: any;

  beforeEach(() => {
    companyContentModel = {
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    service = new CompanyContentService(companyContentModel);
  });

  it('usa las FAQs iniciales para documentos antiguos', async () => {
    const { faqs: _faqs, ...legacyDocument } = buildContentDocument();
    companyContentModel.findOne.mockReturnValue(execResult(legacyDocument));

    const content = await service.getPublicContent();

    expect(content.faqs).toEqual(DEFAULT_COMPANY_CONTENT.faqs);
  });

  it('normaliza y elimina preguntas duplicadas al guardar', async () => {
    const document = buildContentDocument();
    companyContentModel.findOne.mockReturnValue(execResult(document));
    companyContentModel.findByIdAndUpdate.mockReturnValue(
      execResult({
        ...document,
        faqs: [
          {
            question: 'Como compro?',
            answer: 'Selecciona tus productos y confirma tu pedido.',
          },
        ],
      }),
    );

    await service.updateContent({
      faqs: [
        {
          question: '  Como compro?  ',
          answer: '  Selecciona tus productos y confirma tu pedido.  ',
        },
        {
          question: 'como compro?',
          answer: 'Esta respuesta repetida no se conserva.',
        },
      ],
    });

    expect(companyContentModel.findByIdAndUpdate).toHaveBeenCalledWith(
      document.id,
      {
        $set: {
          faqs: [
            {
              question: 'Como compro?',
              answer: 'Selecciona tus productos y confirma tu pedido.',
            },
          ],
        },
      },
      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  });
});
