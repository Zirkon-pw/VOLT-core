export type PluginUiMessages = {
  commands: {
    createBoard: string;
    newBoard: string;
  };
  prompts: {
    createBoardTitle: string;
    createBoardDescription: string;
    createBoardPlaceholder: string;
    createBoardSubmit: string;
    createBoardDefaultPath: string;
    createBoardInFolderTitle: string;
    createBoardInFolderDescription: (path: string) => string;
    createBoardInFolderPlaceholder: string;
    createBoardInFolderDefaultName: string;
  };
  actions: {
    importImage: string;
    linkNote: string;
    close: string;
  };
  notePicker: {
    title: string;
    description: string;
    filterPlaceholder: string;
    empty: string;
  };
  notices: {
    selectElementBeforeLinking: string;
    failedToSaveBoard: string;
    failedToLoadBoard: string;
    failedToImportImage: string;
    failedToInsertImage: string;
  };
  status: {
    loadingBoard: string;
  };
  errors: {
    failedToLoadImageDimensions: string;
  };
};

const EN_MESSAGES: PluginUiMessages = {
  commands: {
    createBoard: 'Create board',
    newBoard: 'New board',
  },
  prompts: {
    createBoardTitle: 'Create board',
    createBoardDescription: 'Enter a relative path for the new board.',
    createBoardPlaceholder: 'boards/project-roadmap.board',
    createBoardSubmit: 'Create',
    createBoardDefaultPath: 'boards/untitled-board',
    createBoardInFolderTitle: 'New board',
    createBoardInFolderDescription: (path) => `Create a board inside "${path}".`,
    createBoardInFolderPlaceholder: 'untitled-board.board',
    createBoardInFolderDefaultName: 'untitled-board',
  },
  actions: {
    importImage: 'Import image',
    linkNote: 'Link note',
    close: 'Close',
  },
  notePicker: {
    title: 'Link note',
    description: 'Choose a markdown note to attach to the selected element.',
    filterPlaceholder: 'Filter notes...',
    empty: 'No notes found.',
  },
  notices: {
    selectElementBeforeLinking: 'Select an element before linking a note.',
    failedToSaveBoard: 'Failed to save board.',
    failedToLoadBoard: 'Failed to load board.',
    failedToImportImage: 'Failed to import image.',
    failedToInsertImage: 'Failed to insert image.',
  },
  status: {
    loadingBoard: 'Loading board…',
  },
  errors: {
    failedToLoadImageDimensions: 'Failed to load image dimensions',
  },
};

const RU_MESSAGES: PluginUiMessages = {
  commands: {
    createBoard: 'Создать доску',
    newBoard: 'Новая доска',
  },
  prompts: {
    createBoardTitle: 'Создать доску',
    createBoardDescription: 'Укажите относительный путь для новой доски.',
    createBoardPlaceholder: 'boards/project-roadmap.board',
    createBoardSubmit: 'Создать',
    createBoardDefaultPath: 'boards/untitled-board',
    createBoardInFolderTitle: 'Новая доска',
    createBoardInFolderDescription: (path) => `Создать доску внутри "${path}".`,
    createBoardInFolderPlaceholder: 'untitled-board.board',
    createBoardInFolderDefaultName: 'untitled-board',
  },
  actions: {
    importImage: 'Импортировать изображение',
    linkNote: 'Привязать заметку',
    close: 'Закрыть',
  },
  notePicker: {
    title: 'Привязать заметку',
    description: 'Выберите markdown-заметку, которую нужно привязать к выбранному элементу.',
    filterPlaceholder: 'Фильтр заметок...',
    empty: 'Заметки не найдены.',
  },
  notices: {
    selectElementBeforeLinking: 'Сначала выберите элемент, к которому нужно привязать заметку.',
    failedToSaveBoard: 'Не удалось сохранить доску.',
    failedToLoadBoard: 'Не удалось загрузить доску.',
    failedToImportImage: 'Не удалось импортировать изображение.',
    failedToInsertImage: 'Не удалось вставить изображение.',
  },
  status: {
    loadingBoard: 'Загрузка доски…',
  },
  errors: {
    failedToLoadImageDimensions: 'Не удалось определить размеры изображения',
  },
};

function normalizePluginUiLocale(locale: string | null | undefined): 'en' | 'ru' {
  const normalized = locale?.trim().toLowerCase() ?? '';
  return normalized.startsWith('ru') ? 'ru' : 'en';
}

export function getPluginUiMessages(locale: string | null | undefined): PluginUiMessages {
  return normalizePluginUiLocale(locale) === 'ru' ? RU_MESSAGES : EN_MESSAGES;
}
