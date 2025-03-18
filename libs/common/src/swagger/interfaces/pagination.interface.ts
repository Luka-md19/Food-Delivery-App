export interface PaginatedResponse<T>{
  items: T[];
  meta:{
    total : number;
    page: number;
    limit: number;
    totalPages: number;
    timeStamp: string;
    user: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
